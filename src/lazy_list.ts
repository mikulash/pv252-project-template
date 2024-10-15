const template = document.createElement("template");
template.innerHTML = `
<style>
#list {
  height: var(--height);
  width: var(--width);  
  border: var(--border);
  padding: var(--padding);
  overflow: scroll;
  scrollbar-width: none;
}
#spacer-top {
  width: 100%;
  height: 0px;
}
#spacer-bottom {
  width: 100%;
  height: 1000px;
}
</style>
<div id="list">
  <div id="spacer-top"></div>
  <slot></slot>
  <div id="spacer-bottom"></div>
</div>
`;

export type Renderer<T> = (item: T) => HTMLElement;

export class LazyList<T> extends HTMLElement {
  // By default, the list renders the items as div-s with strings in them.
  #renderFunction: Renderer<T> = (item) => {
    const element = document.createElement("div");
    element.innerText = JSON.stringify(item);
    return element;
  };

  // By default, the list is empty.
  #data: T[] = [];

  // The amount of space that needs to be shown before the first visible item.
  #topOffset: number = 0;
  #topOffsetElement: HTMLElement;
  // The amount of space that needs to be shown after the last visible item.
  #bottomOffset: number = 0;
  #bottomOffsetElement: HTMLElement;

  // The container that stores the spacer elements and the slot where items are inserted.
  #listElement: HTMLElement;
  #bufferSize = 4;
  #itemHeight=  350;

  static register() {
    customElements.define("lazy-list", LazyList);
  }

  constructor() {
    super();
  }

  connectedCallback() {
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(template.content.cloneNode(true));

    this.#topOffsetElement =
      this.shadowRoot.querySelector<HTMLElement>("#spacer-top")!;
    this.#bottomOffsetElement =
      this.shadowRoot.querySelector<HTMLElement>("#spacer-bottom")!;
    this.#listElement = this.shadowRoot.querySelector<HTMLElement>("#list")!;

    this.#listElement.onscroll = () => {
      this.#onscroll();
    };
  }

  setData(data: T[]) {
    this.#data = data;
    this.#onscroll();
  }

  setRenderer(renderer: Renderer<T>) {
    this.#renderFunction = renderer;
    this.#onscroll();
  }

  #onscroll() {
    // console.groupCollapsed("Scroll event");
    const totalItems = this.#data.length;
    const scrollTop = this.#listElement.scrollTop;

    const visibleStartIndex = Math.max(Math.floor(scrollTop / this.#itemHeight) - this.#bufferSize, 0);
    // console.log("Visible start index", visibleStartIndex);

    const numVisibleItems =
      Math.ceil( this.#listElement.clientHeight /  this.#itemHeight) + this.#bufferSize;
    // console.log("Num visible items", numVisibleItems);

    const visibleEndIndex = Math.min(visibleStartIndex + numVisibleItems, totalItems);
    // console.log("Visible end index", visibleEndIndex);

    this.#setOffsets(visibleStartIndex, visibleEndIndex);

    this.#removeExistingItems();

    this.#renderItems(visibleStartIndex, visibleEndIndex);
    // console.groupEnd();
  }

  #setOffsets(startIdx: number, endIdx: number) {
    this.#topOffset = startIdx * this.#itemHeight;
    this.#bottomOffset = (this.#data.length - endIdx) * this.#itemHeight;
    this.#topOffsetElement.style.height = `${this.#topOffset}px`;
    this.#bottomOffsetElement.style.height = `${this.#bottomOffset}px`;
  }

  #removeExistingItems() {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  }

  #renderItems(fromIdx: number, toIdx: number) {
    for (let i = fromIdx; i < toIdx; i++) {
      const item = this.#data[i];
      const itemElement = this.#renderFunction(item);
      this.appendChild(itemElement);
    }
  }
}
