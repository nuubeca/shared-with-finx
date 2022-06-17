"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * A Transform2D object represents the visual 2D matrix transformations applicable to a view.
 * @class Transform2D
 * @since 0.1.0
 */
var Transform2D = function () {

	//--------------------------------------------------------------------------
	// Methods
	//--------------------------------------------------------------------------

	/**
  * Initializes the matrix.
  * @constructor
  * @since 0.1.0
  */


	/**
  * e
  * @since 0.1.0
  */


	/**
  * c
  * @since 0.1.0
  */


	//--------------------------------------------------------------------------
	// Properties
	//--------------------------------------------------------------------------

	/*
 		a	c	e
 	b	d	f
 	0	0	1
 	*/

	/**
  * a
  * @since 0.1.0
  */
	function Transform2D(a, b, c, d, e, f) {
		_classCallCheck(this, Transform2D);

		this.a = 1;
		this.b = 0;
		this.c = 0;
		this.d = 1;
		this.e = 0;
		this.f = 0;


		var matrix = arguments[0];
		if (matrix instanceof Transform2D) {
			this.a = matrix.a;
			this.b = matrix.b;
			this.c = matrix.c;
			this.d = matrix.d;
			this.e = matrix.e;
			this.f = matrix.f;
			return this;
		}

		if (arguments.length === 6) {
			this.a = a;
			this.b = b;
			this.c = c;
			this.d = d;
			this.e = e;
			this.f = f;
			return this;
		}

		this.reset();

		return this;
	}

	/**
  * Translates the matrix.
  * @method translate
  * @since 0.1.0
  */


	/**
  * f
  * @since 0.1.0
  */


	/**
  * d
  * @since 0.1.0
  */


	/**
  * b
  * @since 0.1.0
  */


	_createClass(Transform2D, [{
		key: "translate",
		value: function translate(x, y) {
			this.e += x * this.a + y * this.b;
			this.f += x * this.c + y * this.d;
			return this;
		}

		/**
   * Scales the matrix.
   * @method scale
   * @since 0.1.0
   */

	}, {
		key: "scale",
		value: function scale(x, y) {
			this.a *= x;
			this.c *= x;
			this.b *= y;
			this.d *= y;
			return this;
		}

		/**
   * Rotates the matrix.
   * @method rotate
   * @since 0.1.0
   */

	}, {
		key: "rotate",
		value: function rotate(angle) {

			angle = angle || 0;

			var cos = Math.cos(angle);
			var sin = Math.sin(angle);

			var a = this.a;
			var b = this.b;
			var c = this.c;
			var d = this.d;

			this.a = cos * a + sin * b;
			this.b = -sin * a + cos * b;
			this.c = cos * c + sin * d;
			this.d = -sin * c + cos * d;

			return this;
		}

		/**
   * Multiply the matrix with the specified matrix.
   * @method concat
   * @since 0.1.0
   */

	}, {
		key: "concat",
		value: function concat(a, b, c, d, e, f) {

			var matrix = arguments[0];
			if (matrix instanceof Matrix) {
				a = matrix.a;
				b = matrix.b;
				c = matrix.c;
				d = matrix.d;
				e = matrix.e;
				f = matrix.f;
			}
			// WRONG
			var ra = a * this.a + c * this.b;
			var rb = b * this.a + d * this.b;
			var rc = a * this.c + c * this.d;
			var rd = b * this.c + d * this.d;
			var re = a * this.a + f * this.b;
			var rf = b * this.c + f * this.d;

			this.a = ra;
			this.b = rb;
			this.c = rc;
			this.d = rd;
			this.e = re;
			this.f = rf;

			return this;
		}

		/**
   * Resets the matrix.
   * @method reset
   * @since 0.1.0
   */

	}, {
		key: "reset",
		value: function reset() {
			this.a = 1;
			this.b = 0;
			this.c = 0;
			this.d = 1;
			this.e = 0;
			this.f = 0;
			return this;
		}

		/**
   * Transforms a point using the matrix.
   * @method transform
   * @since 0.1.0
   */

	}, {
		key: "transform",
		value: function transform(point) {
			var x = point.x;
			var y = point.y;
			point.x = this.a * x + this.c * y;
			point.y = this.b * x + this.d * y;
			return this;
		}

		/**
   * Indicates whether the matrix is the identity matrix.
   * @method isIdentity
   * @since 0.1.0
   */

	}, {
		key: "isIdentity",
		value: function isIdentity() {
			return this.a === 1 && this.c === 0 && this.b === 0 && this.d === 1 && this.e === 0 && this.f === 0;
		}
	}]);

	return Transform2D;
}();