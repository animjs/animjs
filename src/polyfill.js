(function () {
    function CustomEvent ( event, params ) {
        params = params || { bubbles: false, cancelable: false, detail: undefined };
        var evt = document.createEvent( 'CustomEvent' );
        evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
        return evt;
    }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
})();

if (typeof Array.prototype.indexOf !== "function") {
    Array.prototype.indexOf = function (item) {
        for(var i = 0; i < this.length; i++) {
            if (this[i] === item) {
                return i;
            }
        }
        return -1;
    };
}
if(!Array.isArray) {
    Array.isArray = function(arg) {
        return Object.prototype.toString.call(arg) === '[object Array]';
    };
}

// getComputedStyle
!('getComputedStyle' in this) && (this.getComputedStyle = (function () {
    function getPixelSize(element, style, property, fontSize) {
        var
            sizeWithSuffix = style[property],
            size = parseFloat(sizeWithSuffix),
            suffix = sizeWithSuffix.split(/\d/)[0],
            rootSize;

        fontSize = fontSize != null ? fontSize : /%|em/.test(suffix) && element.parentElement ? getPixelSize(element.parentElement, element.parentElement.currentStyle, 'fontSize', null) : 16;
        rootSize = property == 'fontSize' ? fontSize : /width/i.test(property) ? element.clientWidth : element.clientHeight;

        return (suffix == 'em') ? size * fontSize : (suffix == 'in') ? size * 96 : (suffix == 'pt') ? size * 96 / 72 : (suffix == '%') ? size / 100 * rootSize : size;
    }

    function setShortStyleProperty(style, property) {
        var
            borderSuffix = property == 'border' ? 'Width' : '',
            t = property + 'Top' + borderSuffix,
            r = property + 'Right' + borderSuffix,
            b = property + 'Bottom' + borderSuffix,
            l = property + 'Left' + borderSuffix;

        style[property] = (style[t] == style[r] == style[b] == style[l] ? [style[t]]
            : style[t] == style[b] && style[l] == style[r] ? [style[t], style[r]]
            : style[l] == style[r] ? [style[t], style[r], style[b]]
            : [style[t], style[r], style[b], style[l]]).join(' ');
    }

    function CSSStyleDeclaration(element) {
        var
            currentStyle = element.currentStyle,
            style = this,
            fontSize = getPixelSize(element, currentStyle, 'fontSize', null);

        for (property in currentStyle) {
            if (/width|height|margin.|padding.|border.+W/.test(property) && style[property] !== 'auto') {
                style[property] = getPixelSize(element, currentStyle, property, fontSize) + 'px';
            } else if (property === 'styleFloat') {
                style['float'] = currentStyle[property];
            } else {
                style[property] = currentStyle[property];
            }
        }

        setShortStyleProperty(style, 'margin');
        setShortStyleProperty(style, 'padding');
        setShortStyleProperty(style, 'border');

        style.fontSize = fontSize + 'px';

        return style;
    }

    CSSStyleDeclaration.prototype = {
        constructor: CSSStyleDeclaration,
        getPropertyPriority: function () {},
        getPropertyValue: function ( prop ) {
            return this[prop] || '';
        },
        item: function () {},
        removeProperty: function () {},
        setProperty: function () {},
        getPropertyCSSValue: function () {}
    };

    function getComputedStyle(element) {
        return new CSSStyleDeclaration(element);
    }

    return getComputedStyle;
})(this));