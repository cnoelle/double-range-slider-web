import { createElement } from "./utils.js";

export class DoubleRangeSlider extends HTMLElement {

    static readonly #DEFAULT_TAG: string = "double-range-slider";
    static readonly #DEFAULT_RANGE: [number, number] = [0, 100];
    static #tag: string|undefined;
    // min/max values
    #range: [number, number] = [...DoubleRangeSlider.#DEFAULT_RANGE];
    #midPoint: number = DoubleRangeSlider.#DEFAULT_RANGE[1]/2;
    #step: number|undefined = 1;  // undefined means "any"

    // cf. https://developer.mozilla.org/de/docs/Web/HTML/Reference/Elements/input/range
    static observedAttributes = ["list", "min", "max", "step"];


    /**
     * Call once to register the new tag type "<double-range-slider></double-range-slider>"
     * @param tag 
     */
    static register(tag?: string) {
        tag = tag || DoubleRangeSlider.#DEFAULT_TAG;
        if (tag !== DoubleRangeSlider.#tag) {
            customElements.define(tag, DoubleRangeSlider);
            DoubleRangeSlider.#tag = tag;
        }
    }

    /**
     * Retrieve the registered tag type for this element type, or undefined if not registered yet.
     */
    static tag(): string|undefined {
        return DoubleRangeSlider.#tag;
    }

    readonly #min: HTMLInputElement;
    readonly #max: HTMLInputElement;

    constructor() {
        super();
        const style: HTMLStyleElement = document.createElement("style");
        style.textContent = ":host {--drs-point-radius: 5px; } \n" + 
            ".slider-container {display: flex; padding-right: calc(2 * var(--drs-point-radius)); }\n";
        const shadow: ShadowRoot = this.attachShadow({mode: "open", delegatesFocus: true});
        shadow.appendChild(style);
        const container = createElement("div", {parent: shadow});
        const sliderContainer = createElement("div", {parent: container, classes: "slider-container"});
        const min = createElement("input", {attributes: {type: "range"}, parent: sliderContainer});
        const max = createElement("input", {attributes: {type: "range"}, parent: sliderContainer});
        const minVal = this.#range[0];
        const maxVal = this.#range[1];
        const midVal = this.#midPoint;
        min.min = minVal.toString();
        min.max = midVal.toString();
        max.min = midVal.toString();
        max.max = maxVal.toString();
        min.style.width = "calc(50% + var(--drs-point-radius))";
        max.style.width = "calc(50% + var(--drs-point-radius))";
        this.#min = min;
        this.#max = max;
        const changeListener = this.changed.bind(this);
        //const clickListener = this.clicked.bind(this);
        min.addEventListener("input", changeListener);
        max.addEventListener("input", changeListener);
        min.addEventListener("change", changeListener);
        max.addEventListener("change", changeListener);
        /*
        min.addEventListener("click", clickListener);
        max.addEventListener("click", clickListener);
        */
    }

    /*  // probably no need for explicit listener, handled via input or change
    clicked(event: MouseEvent) {
    }
        */

    changed(event: Event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        const min = parseFloat(this.#min.value);
        const max = parseFloat(this.#max.value);
        const center = this.#findMidpoint(parseFloat(this.#min.min), min, max, this.stepNumeric);
        if (center !== this.#midPoint && Number.isFinite(center))
            this.#setMidpoint(center);
        this.#dispatch(event.type as "input"|"change");
    }

    #dispatch(type: "input"|"change") {
        this.dispatchEvent(new CustomEvent<[number, number]>(type, {detail: this.getValues()}));
    }

    attributeChangedCallback(name: string, oldValue: string|null, newValue: string|null) {
        const attr: string = name.toLowerCase();
        const value = parseFloat(newValue!);
        switch (attr) {
        case "min":
        case "max":
            const min = parseFloat(this.getAttribute("min")!);
            const max = parseFloat(this.getAttribute("max")!);
            if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
                this.#setRangeInternal(min, max);
            }
            break;
        case "step":
        case "list":
            if (newValue !== null) {
                this.#min.setAttribute(name, newValue);
                this.#max.setAttribute(name, newValue);
            } else {
                this.#min.removeAttribute(name);
                this.#max.removeAttribute(name);
            }
            break;
        }
    }

    #setRangeInternal(min: number, max: number) {
        const selectedRange = this.getValues();
        const newSelected = [selectedRange[0] >= min && selectedRange[0] <= max ? selectedRange[0] : min,
            selectedRange[1] >= min && selectedRange[1] <= max ? selectedRange[1] : max];
        this.#range[0] = min!;
        this.#range[1] = max!;
        this.#min.min = min.toString();
        this.#max.max = max.toString();
        this.#adaptRange(newSelected[0], newSelected[1], {setLower: true, setUpper: true});
        this.#min.value = newSelected[0].toString();
        this.#max.value = newSelected[1].toString();
    }

    #setMidpoint(midPoint: number) {
        this.#midPoint = midPoint;
        this.#min.max = midPoint.toString();
        this.#max.min = midPoint.toString();
        this.#midPoint = midPoint;
        const range = this.#range[1] - this.#range[0];
        const minPercentage = (midPoint - this.#range[0])/range * 100;
        const maxPercentage = (this.#range[1] - midPoint)/range * 100;
        this.#min.style.width = `calc(${minPercentage}% + var(--drs-point-radius))`;
        this.#max.style.width = `calc(${maxPercentage}% + var(--drs-point-radius))`;
    }

    #adaptRange(valueMin: number, valueMax: number, options?: {setLower?: boolean; setUpper?: boolean;}) {
        const midPoint = this.#findMidpoint(this.min, valueMin, valueMax, this.stepNumeric);
        this.#setMidpoint(midPoint);
        if (options?.setLower)
            this.#min.value = valueMin.toString();
        if (options?.setUpper)
            this.#max.value = valueMax.toString();
    }

    #findMidpoint(min: number, x0: number, x1: number, step: number|undefined, options?: {preferUpper?: boolean;}): number {
        if (step === undefined)
            return (x0 + x1)/2;
        const stepsFromMin = Math.floor((x0 - min) / step);
        const stepsToMax = Math.ceil((x1-min)/step);
        const delta = stepsToMax - stepsFromMin;
        if (delta % 2 === 0)
            return min + (stepsFromMin + delta/2) * step;
        return min + (stepsFromMin + (options?.preferUpper ? delta +1 : delta-1)/2) * step;
    }

    getValues(): [number, number] {
        let min = parseFloat(this.#min.value);
        if (!Number.isFinite(min))
            min = this.#range[0];
        let max = parseFloat(this.#max.value);
        if (!Number.isFinite(max))
            max = this.#range[1];
        return [min, max];
    }

    get min(): number {
        return this.#range[0];
    }

    get max(): number {
        return this.#range[1];
    }

    set min(min: number) {
        if (Number.isFinite(min))
            this.setAttribute("min", min.toString());
    }

    set max(max: number) {
        if (Number.isFinite(max))
            this.setAttribute("max", max.toString());
    }

    get step(): number|string|undefined {
        const step = this.#min.getAttribute("step");
        const asNumber = parseFloat(step!);
        return Number.isFinite(asNumber) ? asNumber : (step || undefined);
    }

    set step(step: number|string|undefined) {
        if (step)
            this.setAttribute("step", step!.toString());
        else
            this.removeAttribute("step");
    }

    get stepNumeric(): number|undefined {
        const step = this.#min.getAttribute("step");
        const asNumber = parseFloat(step!);
        return Number.isFinite(asNumber) ? asNumber : undefined;
    }

}
