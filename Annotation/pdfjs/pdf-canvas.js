$.attach('[data-annotation-frame]', function(i, element) {
	element = $(element)

	//--------------------------------------------------------------------------
	// Properties
	//--------------------------------------------------------------------------

	var contentDocument = null

	var canvases = []

	var rotationCanvases = []

	var annotations = []

	var comments = []

	var openComment = null

	var annotationRequest = []

	var loader = null

	var pdfjs = null

	var disabledButtons = [
		'openFile',
		'viewBookmark',
		'print',
		'secondaryToolbarToggle'
	]

	var promotedButtons = [
		'pageRotateCcw',
		'pageRotateCw',
	]

	var loading = null

	var rotation = 0

	var annotationButtons = []

	var selectedButton = null

	var initialized = false

	//--------------------------------------------------------------------------
	// Functions
	//--------------------------------------------------------------------------

	/**
	 * @function createCanvas
	 * @since 2.1.0
	 */
	var createCanvas = function(index) {

		var currentCanvas = $(contentDocument).find('#page' + index)
		var scale = getScale()

		//Create and insert canvas
		var canvas = $(document.createElement('canvas') )
		canvas.attr('id', 'page' + index + '-annotation-canvas')
		canvas.data('annotation-canvas-index', index)
		canvas.addClass('annotation-canvas')
		currentCanvas.after(canvas)
		// canvas.sketch({scale : scale})
		canvases[index] = canvas.get(0)
		//Bind canvas events
		canvas.on('mouseup touchend', onCanvasOut)

		var width = canvas.width() / scale
		var height = canvas.height() / scale

		canvas.attr('width', width)
		canvas.attr('height', height)

		//Initialize rotation canvases
		if (!(index in rotationCanvases)) {
			//Draw a square rotation canvas
			var measure = width > height ? width : height;

			var rotationCanvas = document.createElement('canvas')
			rotationCanvas.width = measure
			rotationCanvas.height = measure
			rotationCanvases[index] = rotationCanvas
			copyToRotationCanvas(index, canvas.get(0), 0)
		}

		//Load existing annotations
		drawAnnotations(index, canvas.get(0))

		//Load comment
		drawComments(index, canvas.get(0))

		//Bind sketch behavior
		$.attach.refresh(canvas)
	}

	/**
	 * @function onCanvasOut
	 * @since 2.1.0
	 */
	var onCanvasOut = function(e) {
		var index = $(e.target).data('annotation-canvas-index')
		saveAnnotation(index, canvases[index])
	}

	/**
	 * @function clearCanvas
	 * @since 2.1.0
	 */
	var clearCanvas = function() {
		$.each(canvases, function(index, value) {
			if (value) {
				value.getContext('2d').clearRect(0, 0, value.width, value.height)
			}
		})
	}

	/**
	 * @function uiButtonClicked
	 * @since 2.1.0
	 */
	var uiButtonClicked = function(e) {
		var el = $(e.target)

		$(annotationButtons).removeClass('annotation-button-selected')
		el.addClass('annotation-button-selected')
		selectedButton = el

		//Check for sketch tools
		// $.each(['color', 'size', 'opacity', 'tool', 'comment'], function(index, value) {
		// 	if (el.attr('data-' + value)) {
		// 		setValue(value, el.attr('data-' + value))
		// 	}
		// })

		//Check for clear
		// if (el.attr('data-clear')) {
		// 	clearCanvas()
		// }
	}

	/**
	 * @function saving
	 * @since 2.3.0
	 */
	 var saving = function()
	 {
	 	loading.removeClass('annotation-loading-saving annotation-loading-saved annotation-loading-error')
	 	loading.addClass('annotation-loading-active annotation-loading-saving')
	 }

	 /**
	 * @function saved
	 * @since 2.3.0
	 */
	 var saved = function()
	 {
	 	loading.removeClass('annotation-loading-saving annotation-loading-saved annotation-loading-error')
	 	loading.addClass('annotation-loading-active annotation-loading-saved').delay(1000).queue(function() {
	 		$(this).removeClass('annotation-loading-active annotation-loading-saved').dequeue()
	 	})
	 }

	 /**
	 * @function error
	 * @since 2.3.0
	 */
	 var error = function()
	 {
	 	loading.removeClass('annotation-loading-saving annotation-loading-saved annotation-loading-error')
	 	loading.addClass('annotation-loading-active annotation-loading-error'),delay(1000).queue(function() {
	 		$this.removeClass('annotation-loading-active annotation-loading-saved')
	 	})
	 }

	/**
	 * @function saveAnnotation
	 * @since 2.1.0
	 */
	var saveAnnotation = function(index, canvas) {

		//No tool selected
		if (selectedButton == null) {
			return
		}

		if (annotations[index] == canvas.toDataURL()) {
			return
		}

		var url = getDocumentUrl() + '/annotation/sauvegarder'

		if (annotationRequest[index]) {
			annotationRequest[index].abort()
		}

		var rotationData = null

		if (rotation != 0) {
			var inverseRotation = rotation * -1

			copyToRotationCanvases(inverseRotation)
			rotationData = rotationCanvases[index].toDataURL()
			copyToRotationCanvases(rotation)
		}

		var data = rotationData == null ? canvas.toDataURL() : rotationData

		annotationRequest[index] = $.ajax({
			url: url,
			data: {
				content: data,
				page: index
			},
			type: 'POST',
			beforeSend: function (request) {
				saving()
			}
		}).done(function(msg) {
			saved()
			loader.removeClass('annotation-canvas-loading-active')
			annotations[index] = canvas.toDataURL()
			annotationRequest[index] = null
		})
	}

	/**
	 * @function drawAnnotations
	 * @since 2.1.0
	 */
	var drawAnnotations = function(index, canvas) {

		if (annotations[index] === undefined) {
			return
		}

		var img = new Image()
		img.src = annotations[index]
		canvas.getContext('2d').drawImage(img, canvas.width / 2 - img.width / 2, canvas.height / 2 - img.height / 2)
	}

	/**
	 * @function loadAnnotations
	 * @since 2.1.0
	 */
	var loadAnnotations = function() {

		var url = getDocumentUrl() + '/annotation/charger'

		$.ajax({
			url: url,
			type: 'GET',
		}).done(function(data) {
			// loader.removeClass('annotation-canvas-loading-active')
			if (data.hasOwnProperty('content')) {
				$.each(data.content, function(index, value) {
					annotations[value.pageNumber] = value.content
				})
			}
		})
	}

	/**
	 * @function drawComments
	 * @since 2.1.0
	 */
	var drawComments = function(index, canvas) {

		if (comments[index] === undefined) {
			return
		}

		var scale = getScale()

		$.each(comments[index], function(ind, val) {

			var angle = rotation * Math.PI / 180
			var point = {
				x: val.positionX * scale,
				y: val.positionY * scale
			}
			// var transform = new Transform2D()
			// transform.rotate(angle)
			// transform.transform(point)
			// console.log(point)
			// console.log(angle)

			AnnotationComment($(canvas).parent(), {
				id: val.id,
				x: val.positionX * scale,
				y: val.positionY * scale,
				title: val.user,
				message: val.comment
			})
		})
	}

	/**
	 * @function loadComments
	 * @since 2.1.0
	 */
	var loadComments = function() {
		var url = getDocumentUrl() + '/commentaire/charger'

		$.ajax({
			url: url,
			type: 'GET',
		}).done(function(data) {
			if (data.hasOwnProperty('content')) {
				$.each(data.content, function(index, value) {
					if (comments[value.pageNumber] == undefined) {
						comments[value.pageNumber] = []
					}
					comments[value.pageNumber].push(value)
				})
			}
		})
	}

	/**
	 * @function getDocumentUrl
	 * @since 2.3.0
	 */
	var getDocumentUrl = function() {
		return window.location.href.replace(/(\d+)(?!.*\d)/, element.attr('data-document-id'))
	}

	/**
	 * @function getPdfjs
	 * @since 2.1.0
	 */
	var getPdfjs = function() {
		return document.getElementById(element.attr('id')).contentWindow.PDFViewerApplication
	}

	/**
	 * @function getScale
	 * @since 2.1.0
	 */
	var getScale = function() {
		return getPdfjs().pdfViewer.currentScale
	}

	/**
	 * @function copyToRotationCanvases
	 * @since 2.3.0
	 */
	var copyToRotationCanvases = function(newAngle) {
		$.each(canvases, function(index, value) {
			if (value) {
				copyToRotationCanvas(index, value, newAngle)
			}
		})
	}

	/**
	 * @function copyToRotationCanvas
	 * @since 2.3.0
	 */
	var copyToRotationCanvas = function(index, canvas, newAngle) {
		var context = canvas.getContext('2d')
		var rotationCanvas = rotationCanvases[index]
		var rotationContext = rotationCanvas.getContext('2d')
		var angle = newAngle * Math.PI / 180
		rotationContext.save()
		rotationContext.clearRect(0, 0, rotationCanvas.width, rotationCanvas.height)
		rotationContext.translate(rotationCanvas.width / 2, rotationCanvas.height / 2)
		rotationContext.rotate(angle)
		rotationContext.translate((rotationCanvas.width / 2) * (-1), (rotationCanvas.height / 2) * (-1))
		rotationContext.drawImage(canvas, rotationCanvas.width / 2 - canvas.width / 2, rotationCanvas.height / 2 - canvas.height / 2)
		rotationContext.restore()
	}

	/**
	 * @function onRotateClockwise
	 * @since 2.3.0
	 */
	var onRotateClockwise = function(e) {
		copyToRotationCanvases(90)
	}

	/**
	 * @function onRotateCounterClockwise
	 * @since 2.3.0
	 */
	var onRotateCounterClockwise = function(e) {
		copyToRotationCanvases(-90)
	}

	/**
	 * @function checkRotation
	 * @since 2.3.0
	 */
	var checkRotation = function() {

		if (getPdfjs().pdfViewer.pagesRotation === rotation) {
			return
		}

		rotation = getPdfjs().pdfViewer.pagesRotation
		updateDocumentRotation(rotation)

		$.each(canvases, function(index, value) {
			if (value) {
				applyRotation(value, rotationCanvases[index])
				drawComments(index, value)
			}
		})

	}

	/**
	 * @function applyRotation
	 * @since 2.3.0
	 */
	var applyRotation = function(canvas, rotationCanvas) {
		var context = canvas.getContext('2d')
		context.clearRect(0, 0, canvas.width, canvas.height)
		var drawX = canvas.width / 2 - rotationCanvas.width / 2
		var drawY = canvas.height / 2 - rotationCanvas.height / 2
		context.drawImage(rotationCanvas, drawX, drawY)
	}

	/**
	 * @function updateDocumentRotation
	 * @since 2.3.0
	 */
	var updateDocumentRotation = function(rotation) {
		
		var url = getDocumentUrl() + '/tourner'
		$.ajax({
			url: url,
			type: 'GET',
			data: {rotation : rotation}
		}).done(function(data) {
			element.attr('data-document-rotation', rotation)
		})
	}

	/**
	 * @function createUI
	 * @since 2.1.0
	 */
	var createUI = function() {

		//Insert css into document
		var cssLink = document.createElement('link')
		cssLink.href = '/bundles/core/css/pdf-styles.min.css'
		cssLink.rel = 'stylesheet'
		cssLink.type = 'text/css'
		contentDocument.body.appendChild(cssLink)

		//Insert font into document
		var fontLink = document.createElement('link')
		fontLink.href = 'https://fonts.googleapis.com/css?family=Roboto:700,500,300,400'
		fontLink.rel = 'stylesheet'
		fontLink.type = 'text/css'
		contentDocument.body.appendChild(fontLink)

		//Create main loader layer
		loader = $([
			"<div class='annotation-canvas-loading annotation-canvas-loading-active'>",
			"	<div class='ui-spinner'>",
			"		<div class='ui-spinner-wheel'></div>",
			"	</div>",
			"</div>"
		].join("\n"))

		$(contentDocument).find('#mainContainer').prepend(loader)

		//Create secondary loader layer
		var secondaryLoader = $([
			"<div class='annotation-loading'>",
			"	<div class='annotation-loading-wrapper'>",
			"		<span class='annotation-loading-label annotation-loading-label-saving'>Enregistrement <i class='fa fa-floppy-o'></i></span>",
			"		<span class='annotation-loading-label annotation-loading-label-saved'>Enregistré <i class='fa fa-thumbs-o-up'></i></span>",
			"		<span class='annotation-loading-label annotation-loading-label-error'>Erreur <i class='fa fa-times'></i></span>",
			"	</div>",
			"</div>",
		].join("\n"))

		$(contentDocument).find('#toolbarContainer').prepend(secondaryLoader)

		//Create annotation controls
		var uiContainer = $(contentDocument).find('#toolbarViewerRight')
		annotationButtons.push($("<button class='annotation-button annotation-button-pencil toolbarButton' href='#' data-tool='marker'><i class='fa fa-pencil'></i></button>"))
		annotationButtons.push($([
			"<div class='annotation-button-wrapper toolbarButton'>",
				"<button class='annotation-button annotation-button-highlighter toolbarButton' href='#' data-tool='highlighter' data-color='yellow'><i class='fa fa-square'></i></button>",
				"<button class='annotation-button annotation-button-highlighter toolbarButton' href='#' data-tool='highlighter' data-color='green'><i class='fa fa-square'></i></button>",
				"<button class='annotation-button annotation-button-highlighter toolbarButton' href='#' data-tool='highlighter' data-color='purple'><i class='fa fa-square'></i></button>",
				"<button class='annotation-button annotation-button-highlighter toolbarButton' href='#' data-tool='highlighter' data-color='red'><i class='fa fa-square'></i></button>",
			"</div>",
		].join("\n")))
		annotationButtons.push($("<button class='annotation-button annotation-button-eraser toolbarButton' href='#' data-tool='eraser'><i class='fa fa-eraser'></i></button>"))
		annotationButtons.push($("<button class='annotation-button toolbarButton' href='#' data-tool='comment'><i class='fa fa-comment'></i><span>Commentaire</span></button>"))
		// annotationButtons.push($("<button class='annotation-button annotation-button-erase-all toolbarButton' href='#'><i class='fa fa-ban'></i></a>"))
		uiContainer.prepend(annotationButtons)

		annotationButtons = $(contentDocument).find('#toolbarViewer .annotation-button')
		annotationButtons.on('click', uiButtonClicked)

		//Remove unused buttons
		$.each(disabledButtons, function(ind, val) {
			var button = $(contentDocument).find('#' + val)
			button.hide()
		})

		//Promote buttons to main toolbar
		$.each(promotedButtons, function(ind, val) {
			var target = $(contentDocument).find('#toolbarViewerRight')
			var button = $(contentDocument).find('#' + val)
			button.removeClass('secondaryToolbarButton').addClass('toolbarButton')
			button.detach().appendTo(target)
		})

		loading = $(contentDocument).find('.annotation-loading')

		$(contentDocument).find('#pageRotateCw').on('click', onRotateClockwise)
		$(contentDocument).find('#pageRotateCcw').on('click', onRotateCounterClockwise)
	}

	/**
	 * @function subscribeEvents
	 * @since 2.3.0
	 */
	var subscribeEvents = function() {
		$.subscribe('canvas_saving', function() {
			saving()
		})

		$.subscribe('canvas_saved', function() {
			saved()
		})
	}

	//--------------------------------------------------------------------------
	// Initialization
	//--------------------------------------------------------------------------


	//Wait for iframe to load
    element.load(function() {
    	initialized = false
    	canvases = []
    	rotationCanvases = []
		annotations = []
		comments = []
		annotationButtons = []

		contentDocument = document.getElementById(element.attr('id')).contentDocument

		createUI()
		subscribeEvents()
		loadAnnotations()
		loadComments()

        contentDocument.addEventListener("pagesloaded", function(e) {
        	console.log('pages loaded')
        });

        contentDocument.addEventListener("pagerendered", function(e) {
        	console.log('pages rendered')

        	loader.removeClass('annotation-canvas-loading-active')
        	createCanvas($(e.target).data('page-number'))
        	checkRotation()

        	//Apply initial rotation
        	if (initialized === false) {
        		// getPdfjs().pdfViewer.pagesRotation = element.data('document-rotation')
				initialized = true
				// rotation = element.data('document-rotation')
				copyToRotationCanvases(element.data('document-rotation'))
				getPdfjs().rotatePages(element.data('document-rotation'))
        	}
        });
    });
})