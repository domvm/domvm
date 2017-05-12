// IE8 compatibility polyfills

Text.prototype._node = void 0;  // IE8 doesn't allow to use _node in Text

if (!('textContent' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'textContent', {
		get: function() {
			return this.innerText;
		},
		set: function(value) {
			this.innerText = (value === null ? '' : value);
		}
	});
}

// http://tanalin.com/en/articles/ie-version-js/
// =============================================
// IE versions	| Condition to check for
// ------------------------------------
// 10 or older	| document.all
// 9 or older	| document.all && !window.atob
// 8 or older	| document.all && !document.addEventListener
// 7 or older	| document.all && !document.querySelector
// 6 or older	| document.all && !window.XMLHttpRequest
// 5.x	     	| document.all && !document.compatMode
if (document.all && !document.addEventListener) {  // IE8
	(function () {
        	// Make insertBefore accept null/undefined as a second parameter
		var origInsertBefore = Element.prototype.insertBefore;
		Element.prototype.insertBefore = function (newEl, refEl) {
			if (!refEl)
				this.appendChild(newEl);
			else
				origInsertBefore.call(this, newEl, refEl);
		}

		// Event normalization
		var e = Event.prototype;
		if (!e.preventDefault)
			e.preventDefault = function () { this.returnValue = false }
		if (!e.stopPropagation)
			e.stopPropagation = function () { this.cancelBubble = true }
		Object.defineProperty(e, 'target', {
			get: function() {
				return this.srcElement;
			}
		});
	})();
}

// --------8<--------------------------------------------------------------
// Array.isArray, Function.prototype.bind,
// String.prototype.trim, Element.prototype.matches

if (!Array.isArray) {
  Array.isArray = function(arg) {
    return arg instanceof Array;
  };
}

if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    if (this.prototype) {
      // Function.prototype doesn't have a prototype property
      fNOP.prototype = this.prototype; 
    }
    fBound.prototype = new fNOP();

    return fBound;
  };
}

if (!Array.prototype.map) {
  Array.prototype.map = function(callback/*, thisArg*/) {

    var T, A, k;

    if (this == null) {
      throw new TypeError('this is null or not defined');
    }

    // 1. Let O be the result of calling ToObject passing the |this| 
    //    value as the argument.
    var O = Object(this);

    // 2. Let lenValue be the result of calling the Get internal 
    //    method of O with the argument "length".
    // 3. Let len be ToUint32(lenValue).
    var len = O.length >>> 0;

    // 4. If IsCallable(callback) is false, throw a TypeError exception.
    // See: http://es5.github.com/#x9.11
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function');
    }

    // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
    if (arguments.length > 1) {
      T = arguments[1];
    }

    // 6. Let A be a new array created as if by the expression new Array(len) 
    //    where Array is the standard built-in constructor with that name and 
    //    len is the value of len.
    A = new Array(len);

    // 7. Let k be 0
    k = 0;

    // 8. Repeat, while k < len
    while (k < len) {

      var kValue, mappedValue;

      // a. Let Pk be ToString(k).
      //   This is implicit for LHS operands of the in operator
      // b. Let kPresent be the result of calling the HasProperty internal 
      //    method of O with argument Pk.
      //   This step can be combined with c
      // c. If kPresent is true, then
      if (k in O) {

        // i. Let kValue be the result of calling the Get internal 
        //    method of O with argument Pk.
        kValue = O[k];

        // ii. Let mappedValue be the result of calling the Call internal 
        //     method of callback with T as the this value and argument 
        //     list containing kValue, k, and O.
        mappedValue = callback.call(T, kValue, k, O);

        // iii. Call the DefineOwnProperty internal method of A with arguments
        // Pk, Property Descriptor
        // { Value: mappedValue,
        //   Writable: true,
        //   Enumerable: true,
        //   Configurable: true },
        // and false.

        // In browsers that support Object.defineProperty, use the following:
        // Object.defineProperty(A, k, {
        //   value: mappedValue,
        //   writable: true,
        //   enumerable: true,
        //   configurable: true
        // });

        // For best browser support, use the following:
        A[k] = mappedValue;
      }
      // d. Increase k by 1.
      k++;
    }

    // 9. return A
    return A;
  };
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
  };
}

if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.matchesSelector ||
      Element.prototype.msMatchesSelector || function (selector) {
        var matches = document.querySelectorAll(selector);
        for (var i = 0, len = matches.length; i < len; i++)
          if (matches[i] === this) return true;
        return false;
      }
}

if (typeof Object.create !== 'function') {
  Object.create = function(o, props) {
    function F() {}
    F.prototype = o;

    if (typeof(props) === "object")
      for (var prop in props)
        if (props.hasOwnProperty((prop)))
          F[prop] = props[prop];

    return new F();
  }
}
