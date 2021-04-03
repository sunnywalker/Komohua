"use strict";

// optional ʻokina converter helper to be used with Komohua
// usage: let input = new Komohua('#my-input', { helpers: [KomohuaOkinaConverter] });
const KomohuaConvertToOkina = {
  label: 'Convert to ʻokina',
  tooltip: 'Convert tick, backtick, and left single quote characters to the ʻokina in the selected text (or all if nothing is selected)',
  action: function (instance, input, button) {
    instance.replaceText(input, /`|'|‘|’/g, 'ʻ');
  }
};

const Komohua = function (selector, options = {}) {
  const me = this; // store this for context within sub-methods
  this.inputs = []; // list of inputs that were affected
  this.containers = []; // list of added containers for those affected inputs
  this.footprint = 'aia-o-komohua'; // class used to detect usage

  // start off with some default settings
  me.defaults = {
    containerClass: 'komohua-container', // string: the (one) class for the container
    containerBeforeInput: false, // bool: put the container before the input? before if true, after if not true
    containerTag: 'span', // string: HTML tag name used as the container
    helpers: [], // array: additional buttons as definable helper functions [{label:…,tooltip:…,action:fn()},…]
    helpersClass: 'komohua-helper', // string: the (one) class for helper buttons
    injectorClass: 'komohua-injector', // string: the (one) class for injector buttons
    injectorClassExtra: '', // string: any extra classes for injector buttons
    items: 'ʻĀĒĪŌŪāēīōū'.split('') // array: text items to inject
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
    // b.classList.add(className);
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

    // build the container
    let container = document.createElement(me.settings.containerTag);
    container.setAttribute('class', me.settings.containerClass + ' ' + (me.settings.containerBeforeInput ? 'before' : 'after'));

    // add the injector buttons to the container
    me.settings.items.forEach(txt => {
      container.append(buildInjector(txt, (me.settings.injectorClass + ' ' + me.settings.injectorClassExtra).trim()));
    });

    // add any helpers to the container
    if (me.settings.helpers instanceof Array) {
      me.settings.helpers.forEach(helper => {
        // build the helper button
        const h = buildInjector(helper.label, me.settings.helpersClass);
        h.setAttribute('title', helper.tooltip);
        // add the helper event listener
        h.addEventListener('click', ev => {
          ev.preventDefault();
          helper.action(me, el, ev.target);
        });
        // add the helper button to the container
        container.append(h);
      });
    }

    // add the container to the DOM
    el.parentNode.insertBefore(container, me.settings.containerBeforeInput ? el : el.nextSibling);

    // add the event handler delegation to the container
    container.addEventListener('click', ev => {
      if (ev.target.classList.contains(me.settings.injectorClass)) {
        ev.preventDefault();
        me.injectText(el, ev.target.textContent);
      }
    });

    // add the input and container to the known list
    el.classList.add(me.footprint);
    me.inputs.push(el);
    me.containers.push(container);
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

// remove the functionality and buttons from all of the inputs in this instance
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
