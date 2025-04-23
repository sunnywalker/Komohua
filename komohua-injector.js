// Web component to wrap an input or textarea and add injector buttons
class KomohuaInjector extends HTMLElement {
  connectedCallback() {
    // Find the nested input or textarea element
    this.el = this.querySelector('input, textarea');
    if (!this.el) return;

    // Build options object from attributes
    this.options = {};
    const itemsAttr = this.getAttribute('items') || 'ʻokina=ʻ,ā,ē,ī,ō,ū,Ā,Ē,Ī,Ō,Ū';
    this.options.items = this.parseItems(itemsAttr);

    // this.options.items = itemsAttr.split(',').map(s => s.trim()).filter(Boolean);

    this.options.replace = this.hasAttribute('replace');
    this.options.refocus = this.hasAttribute('refocus');
    this.options.injectorClass = this.getAttribute('injector-class') || 'injector';
    this.options.wrapperClass = this.getAttribute('wrapper-class') || 'injectors';

    this.injectors = [];
    this.options.items.forEach(item => this.injectors.push(this.buildInjector(item)));
    if (this.hasAttribute('debug')) window.console.log(this, this.options.items);

    const fragment = document.createDocumentFragment();
    const wrapper = document.createElement('span');
    wrapper.className = this.options.wrapperClass;
    fragment.appendChild(wrapper);
    this.injectors.forEach(injector => wrapper.appendChild(injector));
    this.appendChild(fragment);
  }

  buildInjector(injector) {
    const b = document.createElement('button');
    b.setAttribute('type', 'button');
    b.className = this.options.injectorClass;
    b.textContent = injector.title;
    b.addEventListener('click', () => this.inject(injector.text));
    return b;
  }

  inject(text) {
    // set the new text value
    if (this.options.replace) {
      this.el.value = text.replace(/\\n/g, "\n");
    } else {
      const start = this.el.selectionStart;
      const pre = this.el.value.substring(0, start);
      const post = this.el.value.substring(this.el.selectionEnd, this.el.value.length);
      this.el.value = pre + text.replace(/\\n/g, "\n") + post;
      this.el.selectionStart = start + text.length;
      this.el.selectionEnd = this.el.selectionStart;
    }

    // emit a change event with the next text value
    const event = new Event('input', { bubbles: true });
    event.simulated = true;
    event.detail = { value: this.el.value };
    this.el.dispatchEvent(event);

    // refocus if element has the refocus attribute
    if (this.options.refocus) this.el.focus();
  }

  parseItems(text) {
    const parts = [];
    let buf = '';
    let escaping = false;
    let inTitle = true;
    let title = '';

    // replace &quot; with " and &#39; with '
    text = text.replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
  
      if (escaping) {
        // if we saw a backslash last time, absorb this char literally
        if (ch === ',' || ch === '\\') {
          buf += ch;
        } else {
          // unknown escape sequence: keep the backslash too
          buf += '\\' + ch;
        }
        escaping = false;
      } else {
        if (ch === '\\') {
          // start escape sequence
          escaping = true;
        } else if (ch === '=') {
          // un-escaped equal sign → split here
          title = buf;
          buf = '';
          inTitle = false;
        } else if (ch === ',') {
          // un-escaped comma → split here
          if (inTitle && title === "") title = buf;
          parts.push({ title: title, text: buf });
          buf = '';
          inTitle = true;
          title = '';
        } else {
          buf += ch;
        }
      }
    }
  
    // if string ended on a lone backslash, keep it
    if (escaping) buf += '\\';
  
    // push the final segment
    if (inTitle && title === "") title = buf;
    parts.push({ title: title, text: buf });
  
    return parts;
  }
}

// Register the custom element
customElements.define('komohua-injector', KomohuaInjector);
