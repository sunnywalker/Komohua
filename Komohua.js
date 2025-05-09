"use strict";

// optional ʻokina converter helper to be used with Komohua
// usage: let input = new Komohua('#my-input', { helpers: [KomohuaOkinaConverter] });
const KomohuaConvertToOkina = {
  label: 'Convert to ʻokina',
  tooltip: 'Convert tick, backtick, and left single quote characters to the ʻokina in the selected text (or all if nothing is selected)',
  action: function (instance, input, button) {
    instance.replaceText(input, /[`'‘’]/g, 'ʻ');
  }
};

const Komohua = function (selector, options = {}) {
  const me = this; // store this for context within sub-methods
  this.inputs = []; // list of inputs that were affected
  this.containers = []; // list of added containers for those affected inputs
  this.footprint = 'aia-o-komohua'; // class used to detect usage
  this.skip_class = 'skip-komohua-injectors'; // class used to detect skip buttons

  // start off with some default settings
  me.defaults = {
    container: null, // HTMLElement: the container element where the inputs will be injected; it will be built if not provided
    containerClass: 'komohua-container', // string: the (one) class for the container
    containerClassExtra: '', // string: any extra classes for the container
    containerBeforeInput: false, // bool: put the container before the input? before if true, after if not true
    containerTag: 'span', // string: HTML tag name used as the container
    helpers: [], // array: additional buttons as definable helper functions [{label:…,tooltip:…,action:fn()},…]
    helpersClass: 'komohua-helper', // string: the (one) class for helper buttons
    injectorCallbackAfter: (input, text) => {}, // function: callback after a pressed injector button does its thing
    injectorCallbackBefore: (input, text) => true, // function: callback before a pressed injector button does its thing. return false to prevent the injection or true to allow it
    injectorClass: 'komohua-injector', // string: the (one) class for injector buttons
    injectorClassExtra: '', // string: any extra classes for injector buttons
    items: 'ʻĀĒĪŌŪāēīōū'.split(''), // array: text items to inject
    skipAhead: null, // optional object with text: text of the skip ahead button and classes: classes of the button
    skipBehind: null // optional object with text: text of the skip behind button and classes: classes of the button
  };

  // merge the user's settings into the defaults
  me.settings = Object.assign({}, me.defaults, options || {});

  // build an array of all the elements provided via the constructor
  let elements = [];
  if (typeof selector === 'string') {
    // evaluate the selector if it's a string
    elements = Array.prototype.slice.call(document.querySelectorAll(selector));
  } else if (selector && (selector instanceof NodeList)) {
    // turn a NodeList into an Array
    elements = Array.prototype.slice.call(selector);
  } else if (selector && (selector instanceof Node)) {
    // turn a single Node into an Array
    elements = [selector];
  } else if (selector instanceof Array) {
    // if the selector is an array, just use that
    elements = selector;
  }

  // create an injector/helper button
  const buildInjector = (title, className) => {
    const b = document.createElement('button');
    b.setAttribute('type', 'button');
    b.setAttribute('class', className);
    b.textContent = title;
    return b;
  };

  // iterate through each input
  elements.forEach(el => {
    // don't proceed if this input was previously processed
    if (el.classList.contains(me.footprint)) {
      //console.log('element already has komohua', el);
      return;
    }
    // don't proceed if there are no injector characters or helpers
    if (me.settings.items.length + me.settings.helpers.length < 1) {
      //console.log('no items or helpers to add', me.settings.items.length, me.settings.helpers.length);
      return;
    }
    // don't proceed if the element doesn't have a selectionStart property
    if (typeof el.selectionStart !== 'number') {
      //console.log('element does not have a selectionStart property', el);
      return;
    }

    // build the container if one wasn't provided
    let container_existed = me.settings.container && me.settings.container.nodeType === Node.ELEMENT_NODE;
    if (typeof me.settings.container === 'string') {
      me.settings.container = document.querySelector(me.settings.container);
      container_existed = true;
    }
    if (!me.settings.container || !(me.settings.container instanceof Node) || me.settings.container.nodeType !== Node.ELEMENT_NODE) {
      me.settings.container = document.createElement(me.settings.containerTag);
      me.settings.container.setAttribute('class', me.settings.containerClass + ' ' + (me.settings.containerBeforeInput ? 'before' : 'after') + ' ' + me.settings.containerClassExtra);
    }

    // add skip ahead link
    if (me.settings.skipAhead) {
      let skip = document.createElement('button');
      skip.type = 'button';
      skip.textContent = me.settings.skipAhead.text || 'skip ahead';
      skip.setAttribute('class', `${me.skip_class} ${me.settings.skipAhead.classes || me.settings.injectorClass}`);
      skip.addEventListener('click', () => me.findNextTabStop(me.settings.container.childNodes[me.settings.container.childNodes.length - 1]).focus());
      me.settings.container.append(skip);
    }

    // add the injector buttons to the container
    me.settings.items.forEach(txt => {
      me.settings.container.append(buildInjector(txt, (me.settings.injectorClass + ' ' + me.settings.injectorClassExtra).trim()));
    });

    // add any helpers to the container
    if (me.settings.helpers instanceof Array) {
      me.settings.helpers.forEach(helper => {
        // build the helper button
        const h = buildInjector(helper.label, (me.settings.helpersClass + ' ' + (helper.classes || '')).trim());
        h.setAttribute('title', helper.tooltip);
        // add the helper event listener
        h.addEventListener('click', ev => {
          ev.preventDefault();
          helper.action(me, el, ev.target);
        });
        // add the helper button to the container
        me.settings.container.append(h);
      });
    }

    // add skip behind link
    if (me.settings.skipBehind) {
      let skip = document.createElement('button');
      skip.type = 'button';
      skip.textContent = me.settings.skipBehind.text || 'skip back';
      skip.setAttribute('class', `${me.skip_class} ${me.settings.skipBehind.classes || me.settings.injectorClass}`);
      skip.addEventListener('click', () => me.findPreviousTabStop(me.settings.container.childNodes[0]).focus());
      me.settings.container.append(skip);
    }

    // add the container to the DOM if it didn't already exist
    if (!container_existed) {
      el.parentNode.insertBefore(me.settings.container, me.settings.containerBeforeInput ? el : el.nextSibling);
    }

    // add the injector event handler delegation to the container
    me.settings.container.addEventListener('click', ev => {
      if (ev.target.classList.contains(me.settings.injectorClass) && !ev.target.classList.contains(me.skip_class)) {
        ev.preventDefault();
        if (!me.settings.injectorCallbackBefore || (typeof me.settings.injectorCallbackBefore === "function" && me.settings.injectorCallbackBefore(el, ev.target.textContent))) {
          me.injectText(el, ev.target.textContent);
          if (typeof me.settings.injectorCallbackAfter === "function") {
            me.settings.injectorCallbackAfter(el, ev.target.textContent);
          }
        }
      }
    });

    // add the input and container to the known list
    el.classList.add(me.footprint);
    me.inputs.push(el);
    me.containers.push(me.settings.container);
  });
};

// insert text into a field -- used by injectors
Komohua.prototype.injectText = function (el, text) {
  const start = el.selectionStart;
  const pre = el.value.substring(0, start);
  const post = el.value.substring(el.selectionEnd, el.value.length);
  el.value = pre + text + post;
  el.selectionStart = start + text.length;
  el.selectionEnd = el.selectionStart;
  el.focus();
};

// remove the functionality and buttons from all the inputs in this instance
Komohua.prototype.remove = function () {
  this.containers.forEach(el => el.remove());
  this.inputs.forEach(el => el.classList && el.classList.remove(this.footprint));
};

// regex replace text in a field -- can be used by helpers
Komohua.prototype.replaceText = function (el, regexp_match, replacement) {
  let start = el.selectionStart;
  let end = el.selectionEnd;
  if (start === end) {
    // work on the whole text if the selection length is zero
    start = 0;
    end = el.value.length;
  }
  const replaced = el.value.substring(start, end).replace(regexp_match, replacement);
  el.value = el.value.substring(0, start) + replaced + el.value.substring(end, el.value.length);
  el.selectionStart = start + replaced.length;
  el.selectionEnd = el.selectionStart;
  el.focus();
};

// find the next tab stop after an element
Komohua.prototype.findNextTabStop = function (el) {
  const all_tab_stops = document.querySelectorAll('input, button, select, textarea, a[href]');
  const list = Array.prototype.filter.call(all_tab_stops, item => item.tabIndex >= '0');
  const index = list.indexOf(el);
  return list[index + 1] || list[0];
};

// find the previous tab stop before an element
Komohua.prototype.findPreviousTabStop = function (el) {
  const all_tab_stops = document.querySelectorAll('input, button, select, textarea, a[href]');
  const list = Array.prototype.filter.call(all_tab_stops, item => item.tabIndex >= '0');
  const index = list.indexOf(el);
  return list[index - 1] || list[list.length - 1];
};
