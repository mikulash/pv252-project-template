// Sadly, WebStorm cannot correctly resolve which CSS is used by
// the FAST HTML templates, so we have to disable this check.
// noinspection CssUnusedSymbol

import { attr, css, FASTElement, html, nullableNumberConverter, observable, when } from "@microsoft/fast-element";
import { reactive } from "@microsoft/fast-element/state.js";

import { allComponents, provideFluentDesignSystem } from '@fluentui/web-components';
import { loadFamousPeople, Person } from "./famous_people.js";
import { Context } from "@microsoft/fast-element/context.js";
provideFluentDesignSystem().register(allComponents);

/*
  Some configuration options that change basic parameters of this demo.
  Feel free to change these for testing.
*/

// The probability of getting and error when loading a person.
const ERROR_RATE = 0.5;
// The time it takes to load one item (simulating data processing and network activity).
const LOAD_TIME = 1000;
// The number of items to be displayed in the list.
const ITEM_COUNT = 20;

/**
 * Objects of this class represent the possible state of the person-list items. Each item
 * can have one of three states:
 *  - Loading: Neither data nor error is available, meaning this item has not finished loading yet.
 *  - Ok: Data (i.e. a Person) is available without an error. This means the data can be rendered.
 *  - Error: There was an error (represented by a string) when loading the data.
 *
 * Note that this is only a "data class" which stores the state of one item, but isn't actually
 * responsible for any UI. You don't have to modify this class.
 */
class PersonListItem {
  data: Person | null = null;
  error: string | null = null;

  constructor(data: Person | null = null, error: string | null = null) {
    this.data = data;
    this.error = error;    
  }

  /**
   * True if the item is currently loading (i.e. it has no data).
   */
  isLoading(): boolean {
    return this.data === null && this.error === null;
  }

  /**
   * True if the item was loaded with an error.
   */
  isError(): boolean {
    return this.data === null && this.error !== null;
  }

  /**
   * True if the item is currently loaded properly and has data.
   */
  isOk(): boolean {
    return this.data !== null && this.error === null;
  }

  /**
   * Update the item with loaded person data.
   */
  setOk(data: Person) {
    this.data = data;
    this.error = null;
  }

  /**
   * Update the item with error string if loading failed.
   */
  setError(error: string) {
    this.data = null;
    this.error = error;
  }

  /**
   * Reset the data in this item to the default "loading" state.
   */
  setLoading() {
    this.data = null;
    this.error = null;
  }
}

/**
 * An interface that describes our context object. In other words, the object that actually
 * stores the state of our famous people list.
 *
 * Initially, all list items managed by this context element are marked as "loading", and
 * the context object will try to fetch and update the data for each one. Once this initial
 * loading phase completes, individual items can be refreshed manually.
 *
 * Here, the context object provides the following API:
 *  - A list of items (of type PersonListItem). Furthermore, our implementation marks each element in the list
 *    as "reactive", which means that whenever it changes, any FAST templates that depend on it will be notified
 *    about the change and re-drawn.
 *  - isLoading: An observable (i.e. reactive) property that indicates that the list has not finished its
 *    initial loading phase.
 *  - loaded: The number of elements that have been loaded so far during the initial loading phase. Once the initial
 *    loading phase finishes, it should hold that loaded == people.length.
 *  - refresh: A method that triggers a refresh for one position in the list. This refresh occurs asynchronously,
 *    and the context object will update the item in the people list directly.
 *
 * Note that this is only the interface. Implementation of this interface is below. Also note that
 * you don't need to modify this interface.
 */
export interface PeopleListContext {
  // A list of "person-like" items. An item is either loading (no data available),
  // or it loaded with an error (an error string is provided), or it is fully loaded.
  people: PersonListItem[];

  // Indicates that at least one person in the list is still loading.
  isLoading: boolean;  

  // The number of loaded elements.
  loaded: number;

  // Refresh element at a given position.
  refresh(position: number): void;
}

/**
 * This is a special operation provided by the FAST framework which registers the
 * PeopleListContext interface as a "context" that can be resolved through dependency
 * injection.
 */
export const PeopleListContextProvider = Context.create<PeopleListContext>("PeopleList");

/**
 * A context element component that implements PeopleListContext. This is a custom HTML element
 * that "provides" a PeopleListContext implementation to all of its child elements.
 *
 * More about each part of this implementation is written in the comments below.
 * You don't need to modify this implementation.
 */
export class PeopleListContextElement extends FASTElement implements PeopleListContext {

  @observable
  people: PersonListItem[] = [];

  // @observable means that any FAST template that uses this value will be re-drawn
  // whenever the value changes.
  @observable
  isLoading: boolean = false;

  @observable
  loaded: number = 0;

  // The full list of famous people that will serve as our "database". 
  // This is just dummy data. Normally, you would fetch it from server or 
  // retrieve it in some other way.
  allPeople = loadFamousPeople();

  constructor() {
    super();

    // Initialize the list with initial empty (i.e. "loading") items.

    // The "reactive" method is very important! It means that not only is the
    // list itself observable, but also that the individual objects in that
    // list are observable and FAST will update any templates that use them
    // if they change.
    const dummyData = [];
    for (let i=0; i<ITEM_COUNT; i++) {
      dummyData.push(reactive(new PersonListItem()));
    }
    this.people = dummyData;
  }

  connectedCallback(): void {
    super.connectedCallback();

    // This line is also important and very specific to FAST: It says
    // that in the HTML subtree defined by this object (the first argument),
    // the PeopleListContextProvider (which we created earlier) should return
    // this object (the second argument) whenever someone requests
    // an implementation of PeopleListContext.
    PeopleListContextProvider.provide(this, this);

    // This code simulates a long-running "loading" procedure that
    // populates the "people" array one by one (possibly with errors).
    
    this.isLoading = true;
    this.loaded = 0;
    const loadOne = () => {
      // Randomly resolve some items as errors and some as "ok".
      if (Math.random() > ERROR_RATE) {
        this.people[this.loaded].setOk(this.allPeople[this.loaded]);
        console.log("Loaded", this.people[this.loaded]);        
      } else {
        this.people[this.loaded].setError("Failed to load.");
        console.log("Failed to load.");
      }
      this.loaded += 1;
      // If there are still some items to load, queue up next loadOne
      // event to happen after LOAD_TIME milliseconds to
      // simulate network delay.
      if (this.loaded < this.people.length) {
        setTimeout(loadOne, LOAD_TIME);
      } else {
        // Otherwise, stop loading.
        this.isLoading = false;
      }
    }
    setTimeout(loadOne, LOAD_TIME);
  }

  /**
   * Refreshes a single item in the list at the specified position.
   *
   * The refresh will happen even if the item is loaded correctly, and can
   * potentially result in an error.
   */
  refresh(position: number) {
    // Only run refresh items that actually exist. Ideally, we would like to
    // log some sort of error if this condition is violated, but that's beyond
    // the scope of this example...
    if (position >= 0 && position < this.people.length) {
      // If the item is already/still loading, it cannot be refreshed.
      if (this.people[position].isLoading()) {
        return;
      }
      // Mark the entry as loading. This will propagate to any templates that
      // use the item, since elements of the list are "observable".
      this.people[position].setLoading();

      // Similar to the `loadOne` function above, randomly update the
      // requested item after LOAD_TIME milliseconds to simulate network
      // and processing delays.
      setTimeout(() => {
        if (Math.random() > ERROR_RATE) {
          this.people[position].setOk(this.allPeople[position]);
          console.log("Reloaded", this.people[position]);        
        } else {
          this.people[position].setError("Failed to load after refresh.");
          console.log("Failed to load.");
        }
      }, LOAD_TIME);
    }    
  }

}

// Finally, we have to "register" our context implementation as a custom HTML
// element. The name of the element is <people-context>, it has no custom
// CSS, and it has no shadow DOM. It only contains one <slot> where all its
// child elements will be placed (a custom HTML element without a <slot>
// cannot have children, since there is "nowhere to put them").
PeopleListContextElement.define({
  name: "people-context",
  template: html`<slot></slot>`
})

/**
 * This class is a custom HTML element that is responsible for displaying one
 * `PersonListItem`. As such, most of its "logic" will be included in its
 * HTML template.
 *
 * In reality (and especially for even more complex list items), we might want
 * to further split this up into smaller subcomponents. For example, we might
 * have one custom HTML element for showing the loading state, another HTML
 * element for showing the error state, and a collection of reusable HTML
 * components for showing the details of for one person. Of course, the
 * decision of when to split up a component into smaller subcomponents is
 * somewhat subjective, and here, we will be fine with just having one "fat"
 * component that is responsible for all the possible states of one list item.
 *
 * There are generally two ways in which this element can "get" the data
 * that it should be displaying (a simple example of this is provided in
 * the `list_examples.ts` file):
 *
 * First, the data can be provided through attributes. For example, the
 * element could have an `error` attribute as well as attributes `person-name`,
 * `person-year`, `person-country`, etc. (alternatively, we could have
 * a `person-json` attribute that contains all data as a JSON string, and we
 * simply parse this JSON). In this scenario, it is the responsibility
 * of the parent element to populate these attributes correctly once
 * they are loaded/changed.
 *
 * Second option is to have some kind of identifier attribute (in this case
 * `position`), and this attribute is used to directly retrieve the data
 * from an instance of `PeopleListContext`. This identifier still needs to be
 * provided by some parent element, but it is expected that it will not change
 * often. As such the parent element does not have to interact with the
 * list item when the item changes state, only when the items are re-arranged.
 *
 * Here, we are aiming for the second approach, but feel free to try the first
 * one as well (again, `list_examples.ts` should be an inspiration, but there
 * isn't one "best" solution).
 */
export class PersonElement extends FASTElement {
  @PeopleListContextProvider context!: PeopleListContext;

  @attr({ converter: nullableNumberConverter })
  position: number | null = 0;

  /**
   * Uses `context` to retrieve the `PersonListItem` that should be rendered
   * by this `PersonElement` (assuming `position` is available).
   *
   * This is just a "helper" method that we can use in our HTML template.
   * For example, instead of calling `x.context.people[x.position]`,
   * we can use `x.person()`.
   */
  public person(): PersonListItem | null {
    throw new Error("Not implemented");
  }

  /**
   * A helper method, similar to `person`, which will call refresh
   * for the current `position`, assuming one is available.
   */
  public refresh() {
    throw new Error("Not implemented");
  }
}

/*

  Note that it could be useful to define templates for the specific types
  of state the PersonElement can have, and then use these templates in the
  "main" element template.

const loadingState = html<PersonElement>`
  ... what should be displayed when the item is loading? ...
`

const errorState = html<PersonElement>`
  ... what should be displayed when the item has an error? ...
`

const okState = html<PersonElement>`
  ... what should be displayed when the item has data? ...
`

*/

// This is the template for the `PersonElement`. Look at the documentation of
// FAST templates to learn more about how to show data in HTML templates.
//
// Furthermore, `html/index.template.ejs` contains some examples of how
// individual states of the list item could be rendered using
// Microsoft Fluent UI. Also note that these examples use inline CSS to be
// as self-contained as possible. Here, you can put such CSS into the CSS
// template for this element.
const personElementTemplate = html<PersonElement>`
   ... render one person list element ...
`;

// This is the CSS template for the `PersonElement`. You can put in it CSS
// rules that you only want to be applicable to
// the shadow DOM of `PersonElement`.
const personElementStyles = css`      
    
`

// Finally, here we are defining the custom element, which we will call
// <person-item>. We assign it the HTML template `personElementTemplate`
// and the CSS template `personElementStyles`.
PersonElement.define({
  name: "person-item",
  template: personElementTemplate,
  styles: personElementStyles,
})

/**
 * This class defines a custom HTML element whose purpose is to render
 * a list of people, provided by the `PeopleListContext`. As such, this
 * element has no attributes (all important information is retrieved from
 * the context object once the element is connected to the UI hierarchy).
 *
 * Secondary responsibility of this element is to show the list "header". This
 * header shows the state of the initial loading process, indicated by
 * `PeopleListContext.isLoading` and `PeopleListContext.loaded`.
 *
 * The implementation again depends on the chosen approach: It can either
 * retrieve data from the context object and give it to each list item,
 * or it can just initialize list items with correct identifiers (`position`
 * in this case) and let the list items retrieve relevant data from
 * the context object.
 */
export class PeopleList extends FASTElement {
  @PeopleListContextProvider context!: PeopleListContext;

  connectedCallback(): void {
    super.connectedCallback();

    // Once connectedCallback is called, the context object should be
    // available, and we can read data from it.

    // Initially we should see all items as loading. Of course, this
    // method will not be called again when the item state changes, but
    // at this point, we could for example create the list items that
    // will actually show the person list.
    for (let i=0; i<this.context.people.length; i++) {
      console.log("Item loading:", this.context.people[i].isLoading())
    }
  }
}

/*
    Again, it could be useful to define the list header as a separate
    template...

const headerTemplate = html<PeopleList>`
  ... the template for the header ...
`;

 */

// Similar to before, this is the HTML template where we can specify what
// the list should actually look like, including the header with the loading
// indicator. Note that if we want the list elements to be independent HTML
// elements now hidden in the shadow DOM, we need some <slot> element where
// we will actually put the <people-item> elements.
const personListTemplate = html<PeopleList>`
  ... render the person list ...
`

// Finally, we define the <people-list> element. In this case, we did not
// give it any CSS template, but feel free to create one if you find it
// useful when designing the list header.
PeopleList.define({
  name: "people-list",
  template: personListTemplate
})