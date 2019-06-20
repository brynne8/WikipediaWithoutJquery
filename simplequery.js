// ==UserScript==
// @name         simplequery
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Alexander Misel
// @match        https://*.wikipedia.org/*
// @grant        none
// ==/UserScript==

/*--------------------------------------------------------------
Core module
requires browser features:
'querySelectorAll' in el
'isArray' in Array
el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector || el.oMatchesSelector
--------------------------------------------------------------*/
function $(selector) {
    return selector instanceof $ ? selector : this instanceof $ ? this.init(selector) : new $(selector);
}
var api = {
    init: function(selector) {
        var nodes = [];
        if ($.isArray(selector)) {
            nodes = selector;
        } else if (typeof selector === 'string') {
            selector = $.trim(selector);
            nodes = selector[0] === '<' ? $.parseHtml(selector) : $.queryNodes(selector);
        } else {
            nodes = [selector];
        }
        this.nodes = nodes;
        this.length = nodes.length;
    },
    each: function(callback) {
        for (var i = 0; i < this.length; i++) {
            if (callback.call(this.nodes[i], i, this.nodes[i]) === false) {
                break;
            }
        }
        return this;
    },
    map: function(callback) {
        return new $($.map(this.nodes, function(el, i) {
            return callback.call(el, i, el);
        }));
    },
    eq: function(index) {
        return new $(this.get(index) || []);
    },
    get: function(index) {
        return typeof index !== 'undefined' ? this.nodes[index] : this.nodes;
    },
    is: function(selector) {
        return selector instanceof $ ? this.nodes[0] === selector.nodes[0] : $.matches(this.nodes[0], selector);
    },
    extend: function(plugins) {
        $.extend(api, plugins);
    }
};
var utils = {
    isArray: Array.isArray,
    each: function(collection, callback) {
        if ($.isArray(collection)) {
            for (var i = 0; i < collection.length; i++) {
                if (callback(i, collection[i]) === false) { break; }
            }
        } else {
            for (var key in collection) {
                if (callback(key, collection[key]) === false) { break; }
            }
        }
    },
    extend: function(out) {
        out === true && (out = {});
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                arguments[i].hasOwnProperty(key) && (out[key] = arguments[i][key]);
            }
        }
        return out;
    },
    parseHtml: function(html) {
        var div = document.createElement('div');
        div.innerHTML = html;
        return $.slice(div.childNodes);
    },
    queryNodes: function(selector, context) {
        context = context || document;
        return context.querySelectorAll ? $.slice(context.querySelectorAll(selector)) : [];
    },
    matches: function(el, selector) {
        return (el.matches || el.matchesSelector || el.msMatchesSelector || el.mozMatchesSelector || el.webkitMatchesSelector).call(el, selector);
    },
    trim: function(string) {
        return string.trim();
    },
    map: function(collection, callback) {
        var temp = [],
            iterator = function(value, key) {
                var result = callback(value, key);
                typeof result !== 'undefined' && result !== null && temp.push(result);
            };
        if ($.isArray(collection)) {
            for (var i = 0; i < collection.length; i++) {
                iterator(collection[i], i);
            }
        } else {
            for (var key in collection) {
                iterator(collection[key], key);
            }
        }
        return temp;
    },
    slice: function(obj, start, end) {
        return Array.prototype.slice.call(obj, start, end);
    }
};
$.prototype = $.fn = api;
utils.extend($, utils);
/*--------------------------------------------------------------
Deferred module
--------------------------------------------------------------*/
function Deferred() {
    this.currentState = 'pending';
    this.onDone = [];
    this.onFail = [];
}
function settle(method, args) {
    var settleViaResolve = method === 'resolve';
    if (this.currentState === 'pending') {
        this.currentState = settleViaResolve ? 'resolved' : 'rejected';
        this[settleViaResolve ? 'doneWith' : 'failedWith'] = args;
        $.each(this[settleViaResolve ? 'onDone' : 'onFail'], function(i, callback) {
            callback.apply(this, args);
        });
    }
    return this;
}
Deferred.prototype = {
    state: function() {
        return this.currentState;
    },
    then: function(done, fail) {
        done && this.done(done);
        fail && this.fail(fail);
        return this;
    },
    always: function(callback) {
        return this.then(callback, callback);
    },
    done: function(callback) {
        this.doneWith ? callback.apply(this, this.doneWith) : this.onDone.push(callback);
        return this;
    },
    fail: function(callback) {
        this.failedWith ? callback.apply(this, this.failedWith) : this.onFail.push(callback);
        return this;
    },
    resolve: function() {
        return settle.call(this, 'resolve', $.slice(arguments));
    },
    reject: function() {
        return settle.call(this, 'reject', $.slice(arguments));
    }
};
$.extend($, {
    Deferred: function() {
        return new Deferred();
    },
    when: function() {
        var deferreds = $.slice(arguments);
        var whenDeferred = $.Deferred();
        var checkDeferreds = function() {
            var resolvedArgs = [];
            var rejectedArgs;
            $.each(deferreds, function(i, deferred) {
                if (deferred instanceof Deferred) {
                    if (deferred.state() === 'resolved') {
                        resolvedArgs.push(deferred.doneWith);
                    } else if (deferred.state() === 'rejected') {
                        rejectedArgs = deferred.failedWith;
                        return false;
                    }
                } else {
                    resolvedArgs.push([deferred]);
                }
            });
            if (rejectedArgs) {
                settle.call(whenDeferred, 'reject', rejectedArgs);
            }
            if (resolvedArgs.length === deferreds.length) {
                resolvedArgs = deferreds.length === 1 ? resolvedArgs[0] : $.map(resolvedArgs, function(args) {
                    return args.length === 1 ? args[0] : args;
                });
                settle.call(whenDeferred, 'resolve', resolvedArgs);
            }
        };
        $.each(deferreds, function(i, deferred) {
            deferred instanceof Deferred && deferred.always(checkDeferreds);
        });
        checkDeferreds();
        return whenDeferred;
    }
});
/*--------------------------------------------------------------
Manipulation module
--------------------------------------------------------------*/
function getFragment(obj) {
    var fragment = document.createDocumentFragment();
    fragment.append(...$(obj).nodes);
    return fragment;
}
$.fn.extend({
    append: function(content) {
        if (typeof content === 'string') {
            return this.each(function(i, el) {
                el.insertAdjacentHTML('beforeend', content);
            });
        } else {
            var fragment = getFragment($(content));
            return this.each(function(i, el) {
                el.appendChild(fragment.cloneNode(true));
            });
        }
    },
    prepend: function(content) {
        if (typeof content === 'string') {
            return this.each(function(i, el) {
                el.insertAdjacentHTML('afterbegin', content);
            });
        } else {
            var fragment = getFragment($(content));
            return this.each(function(i, el) {
                if (el.firstChild) {
                    el.insertBefore(fragment.cloneNode(true), el.firstChild);
                } else {
                    el.appendChild(fragment.cloneNode(true));
                }
            });
        }
    },
    after: function(content) {
        if (typeof content === 'string') {
            return this.each(function(i, el) {
                el.insertAdjacentHTML('afterend', content);
            });
        } else {
            var fragment = getFragment($(content));
            return this.each(function(i, el) {
                el.after(fragment.cloneNode(true));
            });
        }
    },
    before: function(content) {
        if (typeof content === 'string') {
            return this.each(function(i, el) {
                el.insertAdjacentHTML('beforebegin', content);
            });
        } else {
            var fragment = getFragment($(content));
            return this.each(function(i, el) {
                el.before(fragment.cloneNode(true));
            });
        }
    },
    appendTo: function(target) {
        var fragment = getFragment(this);
        $(target).each(function(i, el) {
            el.appendChild(fragment.cloneNode(true));
        });
        return this;
    },
    prependTo: function(target) {
        var fragment = getFragment(this);
        $(target).each(function(i, el) {
            if (el.firstChild) {
                el.insertBefore(fragment.cloneNode(true), el.firstChild);
            } else {
                el.appendChild(fragment.cloneNode(true));
            }
        });
        return this;
    },
    remove: function() {
        return this.each(function() {
            this.parentNode && this.parentNode.removeChild(this);
        });
    },
    detach: function() {
        return this.remove();
    },
    html: function(content) {
        return typeof content !== 'undefined' ? this.each(function() {
            if (typeof content === 'string' && $.trim(content).indexOf('<') !== 0) {
                this.innerHTML = content;
            } else {
                $(this).empty().append(content);
            }
        }) : this.get(0).innerHTML;
    },
    text: function(content) {
        return content ? this.each(function() {
            this.textContent = content;
        }) : this.get(0).textContent;
    },
    empty: function() {
        return this.each(function() {
            this.innerHTML = '';
        });
    },
    replaceWith: function(obj) {
        return this.each(function() {
            this.parentNode.replaceChild($(obj).get(0), this);
        });
    },
    css: function(rule, value) {
        return typeof value !== 'undefined' ? this.each(function() {
            this.style[rule] = value;
        }) : getComputedStyle(this.get(0))[rule];
    },
    hide: function() {
        this.each(function() {
            this.style.display = 'none';
        });
    },
    show: function() {
        this.each(function() {
            this.style.display = 'block';
        });
    }
});
/*--------------------------------------------------------------
Traversing module
requires browser features:
--------------------------------------------------------------*/
$.fn.extend({
    find: function(selector) {
        var nodes = [];
        this.each(function() {
            nodes = Array.prototype.concat(nodes, $.queryNodes(selector, this));
        });
        return new $(nodes);
    },
    parent: function() {
        return $($.map(this.nodes, function(el) {
            return el.parentNode;
        }));
    },
    children: function(selector) {
        var nodes = [];
        this.each(function() {
            nodes = Array.prototype.concat(nodes, $.slice(this.children));
        });
        return selector ? new $(nodes).filter(selector) : new $(nodes);
    },
    closest: function(selector) {
        return $($.map(this.nodes, function(el) {
            var foundNode;
            while (el.nodeType === 1) {
                if ($.matches(el, selector)) {
                    foundNode = el;
                    break;
                } else {
                    el = el.parentNode;
                }
            }
            return foundNode;
        }));
    },
    filter: function(selector) {
        if (typeof selector === 'function') {
            this.nodes = this.nodes.filter(selector);
            return this;
        }
        return selector$($.map(this.nodes, function(el) {
            return $.matches(el, selector) ? el : null;
        }));
    },
    index: function(node) {
        var index = node ? -1 : 0;
        var el = this.get(0);
        if (node) {
            node instanceof $ && (node = node.get(0));
            this.each(function(i, el) {
                el === node && (index = i);
            });
        } else {
            while ((el = el.previousElementSibling)) {
                index++;
            }
        }
        return index;
    },
    first: function() {
        return this.eq(0);
    },
    last: function() {
        return this.eq(this.length - 1);
    },
    next: function(selector) {
        return this.map(function () {
            return this.nextElementSibling;
        }).filter(selector);
    },
    prev: function(selector) {
        return this.map(function () {
            return this.previousElementSibling;
        }).filter(selector);
    }
});
/*--------------------------------------------------------------
Utils module
requires browser features:
--------------------------------------------------------------*/
$.extend($, {
    isEmptyObject: function(obj) {
        var name;
        for (name in obj) { return false; }
        return true;
    },
    isNumeric: function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    contains: function(container, el) {
        var contains = false,
            parent = el.parentNode;
        while (parent && parent.nodeType === 1) {
            if (parent === container) {
                contains = true;
                break;
            }
            parent = parent.parentNode;
        }
        return contains;
    },
    param: function(obj) {
        var serialized = $.isArray(obj);
        return $.map(obj, function(item, key) {
            return encodeURIComponent(serialized ? item.name : key) + '=' + encodeURIComponent(serialized ? item.value : item);
        }).join('&');
    },
    parseJSON: function(data) {
        return JSON.parse(data);
    }
});
$.fn.extend({
    serializeArray: function() {
        return $.map(this[this.is('form') ? 'find' : 'filter']('input, textarea, select').nodes, function(el) {
            if (el.disabled) {
                return null;
            } if (el.type === 'radio' || el.type === 'checkbox') {
                return el.checked ? {name: el.name, value: el.value} : null;
            } else if (el.type === 'select-multiple') {
                return {name: el.name, value: $.map(el.options, function(option) {
                    return option.selected ? option.value : undefined;
                })};
            } else {
                return {name: el.name, value: el.value};
            }
        });
    },
    serialize: function() {
        return $.param(this.serializeArray());
    }
});
/*--------------------------------------------------------------
Events module
requires browser features: 'addEventListener' in el, 'removeEventListener' in el
--------------------------------------------------------------*/
$.fn.extend({
    ready: function (handler) {
        document.addEventListener("DOMContentLoaded", function() {
            handler();
        });
    },
    on: function(eventType, selector, handler) {
        var eventHandler = handler || selector,
            $collection = handler ? this.find(selector) : this;
        $collection.each(function(i, el) {
            el.addEventListener(eventType.split('.')[0], eventHandler, false);
        });
        return this;
    },
    off: function(eventType, selector, handler) {
        var eventHandler = handler || selector,
            $collection = handler ? this.find(selector) : this;
        $collection.each(function(i, el) {
            el.removeEventListener(eventType.split('.')[0], eventHandler, false);
        });
        return this;
    },
    click: function (handler) {
        this.each(function(i, el) {
            el.addEventListener('click', handler, false);
        })
    }
});
/*--------------------------------------------------------------
Classes module
requires browser features: 'classList' in el
--------------------------------------------------------------*/
function classHandlerProxy(className, callback) {
    var classNames = $.trim(className).split(' ');
    return this.each(function(i, el) {
        $.each(classNames, function(i, singleClass) {
            callback(el, singleClass);
        });
    });
}
$.fn.extend({
    addClass: function(className) {
        return classHandlerProxy.call(this, className, function(el, singleClass) {
            el.classList.add(singleClass);
        });
    },
    removeClass: function(className) {
        return classHandlerProxy.call(this, className, function(el, singleClass) {
            el.classList.remove(singleClass);
        });
    },
    hasClass: function(className) {
        return this.nodes[0].classList.contains(className);
    },
    toggleClass: function(className, condition) {
        return classHandlerProxy.call(this, className, function(el, singleClass) {
            if (typeof condition !== 'undefined') {
                el.classList[condition ? 'add' : 'remove'](singleClass);
            } else {
                el.classList.toggle(singleClass);
            }
        });
    }
});
/*--------------------------------------------------------------
Attributes module
--------------------------------------------------------------*/
$.fn.extend({
    attr: function(name, value) {
        return typeof value !== 'undefined' ? this.each(function() {
            this.setAttribute(name, value);
        }) : this.get(0).getAttribute(name);
    },
    removeAttr: function(name) {
        return this.each(function() {
            this.removeAttribute(name);
        });
    },
    val: function(value) {
        if (typeof value === 'undefined') {
            return this.get(0).value;
        }
        this.get(0).value = value;
        return this;
    }
});
/*--------------------------------------------------------------
Ajax module
requires browser features: 'XMLHttpRequest' in window
--------------------------------------------------------------*/
var ajaxDefaults = {
    url: '',
    method: 'GET',
    data: null,
    contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
    dataType: 'html',
    xhrFields: {
        withCredentials: false
    }
};
function ajax(options) {
    options = $.extend({}, ajaxDefaults, options);
    if (options.data && typeof options.data !== 'string') {
        options.data = $.param(options.data);
    }
    var request = new XMLHttpRequest();
    var deferred = $.Deferred();
    var onError = function() {
        var args = $.slice(arguments);
        var ref = args[0].target;
        args[0] = $.extend(args[0], {
            responseText: ref.responseText,
            status: ref.status,
            statusText: ref.statusText
        });
        options.error && options.error.apply(this, args);
        deferred.reject.apply(deferred, args);
    };
    if (options.method === 'GET' && options.data) {
        options.url += (options.url.indexOf('?') >= 0 ? '&' : '?') + options.data;
    }
    request.open(options.method, options.url, true);
    request.withCredentials = options.xhrFields && options.xhrFields.withCredentials;
    request.setRequestHeader('Content-type', options.contentType);
    request.onload = function() {
        var contentType = request.status === 204 ? '' : request.getResponseHeader('content-type');
        var responseText = request.responseText;
        if (request.status >= 200 && request.status < 400) {
            var args = [contentType.indexOf('json') > -1 ? JSON.parse(responseText) : responseText, request.status, request];
            if (options.dataType === 'script') {
                window.eval.call(window, $.trim(responseText));
            }
            if (typeof options.success === 'function') {
                options.success.apply(this, args);
            }
            deferred.resolve.apply(deferred, args);
        } else {
            onError.apply(this, arguments);
        }
    };
    request.onerror = onError;
    request.send(options.data);
    return deferred;
}
function shortAjax(method, url, data, callback) {
    return ajax({
        url: url,
        method: method,
        data: callback ? data : (typeof data === 'function' ? null : data),
        success: callback || (typeof data === 'function' ? data : null)
    });
}
$.extend($, {
    ajax: function(options) {
        return ajax(options);
    },
    get: function(url, data, callback) {
        return shortAjax('GET', url, data, callback);
    },
    post: function(url, data, callback) {
        return shortAjax('POST', url, data, callback);
    }
});

$('head').append('<style>.mw-content-ltr{text-align:justify;hyphens:auto}.mw-collapsible-arrow.mw-collapsible-toggle-collapsed,.mw-icon-arrow-collapsed{background-image:url(/w/resources/src/mediawiki.icon/images/arrow-collapsed-ltr.png?9fdfe);background-image:linear-gradient(transparent,transparent),url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22%3E %3Cpath fill=%22%2372777d%22 d=%22M4 1.533v9.671l4.752-4.871z%22/%3E %3C/svg%3E");background-repeat:no-repeat;background-position:left bottom}.mw-collapsible-arrow.mw-collapsible-toggle-expanded,.mw-icon-arrow-expanded{background-image:url(/w/resources/src/mediawiki.icon/images/arrow-expanded.png?39834);background-image:linear-gradient(transparent,transparent),url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22%3E %3Cpath fill=%22%2372777d%22 d=%22M1.165 3.624h9.671l-4.871 4.752z%22/%3E %3C/svg%3E");background-repeat:no-repeat;background-position:left bottom}.mw-editfooter-toggler{cursor:pointer;background-position:left center;padding-left:16px}.client-js td.mw-collapsible:not(.mw-collapsed):before,.client-js table.mw-collapsible:not(.mw-collapsed):first-child tr:first-child th:last-child:before,.client-js table.mw-collapsible:not(.mw-collapsed) > caption:first-child:after,.client-js div.mw-collapsible:not(.mw-collapsed):before{content:"[折叠]"}.NavFrame.collapsed .NavContent{display:none;}.NavHead{font-weight:bold;cursor:pointer;}</style>');

if (Array.isArray(window.RLQ) && window.RLQ.length > 1) {
    var tempMW = null;
    if (window.mw) {
        tempMW = window.mw;
    }
    window.mw = {
        config: {
            set: function(data) {
                for (var key in data) {
                    window[key] = data[key];
                }
            }
        },
        loader: {
            load: function(data) {},
            state: function() {},
            implement: function() {}
        }
    };
    window.RLQ[0]();
    window.RLQ[1]();
    window.mw = tempMW;
    window.mw.Api = function () {
        this.get = function (params) {
            Object.keys(params).forEach((key) => (params[key] == null) && delete params[key]);
            return $.get('//' + window.location.host + '/w/api.php', params);
        }
    }
} else {
    window.mw.Api = function () {
        this.get = function (params) {
            Object.keys(params).forEach((key) => (params[key] == null) && delete params[key]);
            return $.get('//' + window.location.host + '/w/api.php', params);
        }
    }
}


(function () {
    // If MathPlayer is installed we show the MathML rendering.
    if ( navigator.userAgent.indexOf( 'Firefox' ) > -1 ) {
        $( '.mwe-math-mathml-a11y' ).removeClass( 'mwe-math-mathml-a11y' );
        $( '.mwe-math-fallback-image-inline, .mwe-math-fallback-image-display' ).css( 'display', 'none' );
    }

    // Interface related
    $('#mw-searchButton').remove();

    if ($('#preferences').length) {
        $('#preferences .oo-ui-menuLayout-content .mw-htmlform-autoinfuse-lazy').addClass('oo-ui-element-hidden').removeClass('oo-ui-panelLayout-framed');
        var activePref = window.location.hash.substr(1);
        if (!activePref) {
            activePref = 'mw-prefsection-personal';
        }
        $('#' + activePref).parent().removeClass('oo-ui-element-hidden').addClass('oo-ui-tabPanelLayout-active');
        $('.mw-prefs-tabs').addClass('mw-prefs-tabs-infused')

        $('#preferences .oo-ui-menuLayout-menu .oo-ui-labelElement-label').click(function () {
            var $node = $(this);
            if (!$node.parent().hasClass('oo-ui-optionWidget-selected')) {
                $('#preferences .oo-ui-optionWidget-selected').removeClass('oo-ui-optionWidget-selected');
                $node.parent().addClass('oo-ui-optionWidget-selected');
                $('#preferences .oo-ui-tabPanelLayout-active').removeClass('oo-ui-tabPanelLayout-active').addClass('oo-ui-element-hidden');
                activePref = (JSON.parse($node.parent().attr('data-ooui')) || {}).data;
                $('#' + activePref).parent().removeClass('oo-ui-element-hidden').addClass('oo-ui-tabPanelLayout-active');
            }
        });
    }

    $('.mw-collapsible').click(function () {
        var $node = $(this);
        $node.toggleClass('mw-collapsed');
    });

    $('.NavFrame .NavHead').click(function () {
        $(this).parent().toggleClass('collapsed');
    });

    if ($('#mw-input-wpExpiry').length) {
        $('input[name="wpExpiry-other"]').parent().hide();
        $('input[name="wpExpiry-other"]').removeAttr('required');
        $('select[name="wpExpiry"]').on('change', function () {
            if (this.value === 'other') {
                $('input[name="wpExpiry-other"]').parent().removeAttr('style');
            } else {
                $('input[name="wpExpiry-other"]').parent().hide();
            }
        })
    }

    $('.mw-rollback-link a').click(function (e) {
        var summary = prompt('Summary:');
        if (summary === null) {
            e.preventDefault();
        } else {
            this.href += '&summary=' + encodeURIComponent(summary);
        }
    });

    // Editing related
    $('#wpSummaryLabel .mw-summary-preset').on('click', '.mw-summary-preset-item a', function (e) {
        e.preventDefault();
        var $node = $(this);
        var $item = $node.parent();
        var summary = $('#wpSummary').val();
        if (summary != '') {
            summary += ' ';
        }
        summary += $item.attr('title') || $node.text();
        $('#wpSummary').val(summary)
    });

    $('.mw-templatesUsedExplanation')
        .attr('role', 'button')
        .addClass('mw-templatesUsedExplanation mw-editfooter-toggler mw-icon-arrow-collapsed');
    $('.templatesUsed ul').hide();

    $('.mw-templatesUsedExplanation').click(function () {
        var $node = $(this);
        if ($node.hasClass('mw-icon-arrow-collapsed')) {
            $node.removeClass('mw-icon-arrow-collapsed');
            $node.addClass('mw-icon-arrow-expanded');
            $('.templatesUsed ul').show();
        } else {
            $node.removeClass('mw-icon-arrow-expanded');
            $node.addClass('mw-icon-arrow-collapsed');
            $('.templatesUsed ul').hide();
        }
    });
})();
