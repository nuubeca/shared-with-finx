$.attach('.annotation-canvas', function(i, element) {

	//--------------------------------------------------------------------------
	// Properties
	//--------------------------------------------------------------------------

	var contentDocument = null

	var tools = null

	var canvas = $(element)

	var copyCanvas = null

	var drawCanvas = null

	var context = element[0].getContext('2d')

	var painting = false

	var currentTool = null

	var action = null

	var scale = null

	var highlighter = null

	var highlighterColor = null

	//--------------------------------------------------------------------------
	// Functions
	//--------------------------------------------------------------------------

	/**
	 * @function onPaintingStart
	 * @since 2.3.0
	 */
	var onPaintingStart = function(e) {

		if (e.which !== 1) {
			return
		}

		if (currentTool !== null) {

			painting = true

			//Disable markers
			$(contentDocument).find('.ui-annotation').css('z-index', 100)

			canvas.css('cursor', 'crosshair')

			//Reset canvases status
			drawCanvas.getContext('2d').clearRect(0, 0, canvas[0].width, canvas[0].height)
			copyCanvas.getContext('2d').clearRect(0, 0, canvas[0].width, canvas[0].height)
			copyCanvas.getContext('2d').drawImage(canvas[0], 0, 0)

			action = {
				events: []
			}
		}
	}

	/**
	 * @function onPaintingStop
	 * @since 2.3.0
	 */
	var onPaintingStop = function(e) {
		painting = false
		action = null

		//Enable markers
		$(contentDocument).find('.ui-annotation').css('z-index', '')

		canvas.css('cursor', '')
	}

	/**
	 * @function onPaint
	 * @since 2.3.0
	 */
	var onPaint = function(e) {

		if (painting === false || currentTool === null) {
			return
		}

		//Allow only left click
		if (e.type === 'mousedown' && e.which != 1) {
			return
		}

		//Make sure tool is defined
		if (!(currentTool in tools)) {
			return
		}

		action.events.push({
			x: e.pageX - canvas.offset().left,
			y: e.pageY - canvas.offset().top
		})

		requestAnimationFrame(function() {
			tools[currentTool].onPaint(action)
		})
	}

	/**
	 * @function onMarkerPaint
	 * @since 2.3.0
	 */
	var onMarkerPaint = function(action) {
		draw(action, '#000', 2)
	}

	/**
	 * @function onHighlighterPaint
	 * @since 2.3.0
	 */
	var onHighlighterPaint = function(action) {
		drawOpacity(action, highlighterColor, 25, 0.3)
	}

	/**
	 * @function onEraserPaint
	 * @since 2.3.0
	 */
	var onEraserPaint = function(action) {
		var oldcomposite = context.globalCompositeOperation
		context.globalCompositeOperation = "destination-out";
		draw(action, "#000000", 100)
		context.globalCompositeOperation = oldcomposite;
	}

	/**
	 * @function onHightlighterClick
	 * @since 2.3.0
	 */
	var onHightlighterClick = function(e) {
		var currentHighlighter = $(e.target)
		currentHighlighter.parent().prepend(currentHighlighter)
		highlighterColor = currentHighlighter.data('color')
	}

	/**
	 * @function onCommentAdd
	 * @since 2.3.0
	 */
	var onCommentAdd = function(e) {
		if (currentTool === null || currentTool !== 'comment') {
			return
		}

		var contextOffset = canvas.offset()
		var x = e.pageX - contextOffset.left
		var y = e.pageY - contextOffset.top
		AnnotationComment(canvas.parent(), {
			x: x,
			y: y,
			scale: scale
		})
	}

	/**
	 * @function onEraseAllClick
	 * @since 2.3.0
	 */
	var onEraseAllClick = function(e) {
		// console.log('NUKE IT FROM ORBIT')
	}

	/**
	 * @function onToolClick
	 * @since 2.3.0
	 */
	var onToolClick = function(e) {

		currentTool = $(e.target).data('tool')
	}

	/**
	 * @function draw
	 * @since 2.3.0
	 */
	var draw = function(action, color, width) {

		if (action === null) {
			return
		}

		context.lineJoin = "round"
		context.lineCap = "round"
		context.beginPath()
		context.moveTo(action.events[0].x / scale, action.events[0].y / scale)

		for (var i = 0; i < action.events.length; i++) {
			var event = action.events[i]
			context.lineTo(event.x / scale, event.y / scale);
		}
		context.strokeStyle = color
		context.lineWidth = width
		context.stroke()
		action.events = [action.events[i - 1]]
	}

	/**
	 * @function drawOpacity
	 * @since 2.3.0
	 */
	var drawOpacity = function(action, color, width, opacity) {

		if (action === null) {
			return
		}

		var drawContext = drawCanvas.getContext('2d')

		drawContext.lineJoin = "round"
		drawContext.lineCap = "round"
		drawContext.beginPath()
		drawContext.moveTo(action.events[0].x / scale, action.events[0].y / scale)

		for (var i = 0; i < action.events.length; i++) {
			var event = action.events[i]
			drawContext.lineTo(event.x / scale, event.y / scale);
		}
		drawContext.strokeStyle = color
		drawContext.lineWidth = width
		drawContext.stroke()

		//Si c'est encore super slow, cette etape ci pourrait etre faite seulement on mouse up / mouse down
		// au lieu d'a chaque frame

		context.clearRect(0, 0, canvas[0].width, canvas[0].height)
		context.save()
		context.drawImage(copyCanvas, 0, 0)
		context.globalAlpha = opacity
		context.drawImage(drawCanvas, 0, 0)
		context.restore()
		action.events = [action.events[i - 1]]
	}

	//--------------------------------------------------------------------------
	// Initialization
	//--------------------------------------------------------------------------

	contentDocument = document.getElementById('frameID').contentDocument

	tools = {
		marker: {
			el : $(contentDocument).find('[data-tool="marker"]'),
			onPaint: onMarkerPaint
		},
		highlighter: {
			el: $(contentDocument).find('[data-tool="highlighter"]'),
			onPaint: onHighlighterPaint,
		},
		eraser: {
			el: $(contentDocument).find('[data-tool="eraser"]'),
			onPaint: onEraserPaint
		},
	}

	copyCanvas = document.createElement('canvas')
	copyCanvas.width = canvas[0].width
	copyCanvas.height = canvas[0].height

	drawCanvas = document.createElement('canvas')
	drawCanvas.width = canvas[0].width
	drawCanvas.height = canvas[0].height

	scale = document.getElementById('frameID').contentWindow.PDFViewerApplication.pdfViewer.currentScale

	canvas.on('mousedown touchstart', onPaintingStart)
	canvas.on('mouseup mouseleave mouseout touchend touchcancel', onPaintingStop)
	canvas.on('mousemove touchmove', onPaint)

	canvas.on('click', onCommentAdd)

	$(contentDocument).find('.annotation-button-erase-all').on('click', onEraseAllClick)

	$(contentDocument).on('click', '[data-tool]', onToolClick)

	highlighter = $(contentDocument).find('[data-tool="highlighter"]')
	highlighter.on('click', onHightlighterClick)

	//These two should not be properties of sketch, they should be set at canvas level
	currentTool = $(contentDocument).find('.annotation-button-selected').data('tool')
	highlighterColor = $(contentDocument).find('.annotation-button-selected').data('color')
})