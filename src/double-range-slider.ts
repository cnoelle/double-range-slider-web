export class DoubleRangeSlider extends HTMLElement {

    static readonly #DEFAULT_TAG: string = "double-range-slider";
    static readonly #DEFAULT_RANGE: [number, number] = [0, 100];
    static readonly #SUPPORTS_ANCHOR: boolean = CSS.supports("anchor-name", "--test");
    static #tag: string|undefined;
    // min/max values
    #range: [number, number] = [...DoubleRangeSlider.#DEFAULT_RANGE];
    #values: [number, number] = [...DoubleRangeSlider.#DEFAULT_RANGE];
    #midPoint: number = DoubleRangeSlider.#DEFAULT_RANGE[1]/2;

    // cf. https://developer.mozilla.org/de/docs/Web/HTML/Reference/Elements/input/range
    static observedAttributes = ["disabled", "list", "min", "max", "step"];


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

    readonly #sliderContainer: HTMLElement;
    readonly #min: HTMLInputElement;
    readonly #max: HTMLInputElement;
    readonly #inputs: Array<HTMLInputElement>;
    readonly #tooltip1: HTMLElement;
    readonly #tooltip2: HTMLElement;
    readonly #tooltips: Array<HTMLElement>;
    readonly #interactionStartListener: (event: PointerEvent) => void;
    readonly #interactionEndListener: (event: PointerEvent) => void;
    readonly #hoverTooltip: HTMLElement;
    readonly #hoverStartListener: (event: PointerEvent) => void;
    readonly #hoverEndListener: (event: PointerEvent) => void;
    readonly #hoverMoveListener: (event: PointerEvent) => void;
    #tooltipFormatter: ((data: number) => string|HTMLElement)|undefined;
    #ttHover: boolean = false;
    #ttClick: boolean = false;
    #interactionActive: boolean = false;
    #hoverActive: boolean = false;

    constructor() {
        super();
        const style: HTMLStyleElement = document.createElement("style");
        style.textContent = ":host {--dri-track-height: 4px; "+
                "--dri-track-color: #ccc; --dri-track-filled-color: #f72d9c; " +
                "--dri-track-filled-color-disabled: #777; " +
                "--dri-thumb-color: #ddd; --dri-thumb-width: 24px; --dri-thumb-height: 24px; --dri-thumb-border-radius: 24px; " +
                "--dri-thumb-hover-color: #fb8cc9ff; --dri-thumb-active-color: #fb8cc9ff; --dri-thumb-disabled-color: #777; --dri-tooltip-z-index: 1} \n" + 
            ".slider-container {display: flex; padding-right: calc(2 * var(--dri-thumb-width)); --dri-position-0: 0%; --dri-position-1: 100%; }\n" +
            "input { appearance: none; border-radius: 0; margin: 0; outline: 0;}\n" + 
            // firefox
            "input::-moz-range-track {width: 100%; height: var(--dri-track-height); cursor: pointer; }\n" +
            "input:first-child::-moz-range-track { background: linear-gradient(to right, var(--dri-track-color) var(--dri-position-0), var(--dri-track-filled-color) var(--dri-position-0), var(--dri-track-filled-color)); }\n" +
            "input:last-child::-moz-range-track { background: linear-gradient(to right, var(--dri-track-filled-color) var(--dri-position-1), var(--dri-track-color) var(--dri-position-1), var(--dri-track-color)); }\n" +
            "input::-moz-range-thumb {background-color: var(--dri-thumb-color); border-radius: var(--dri-thumb-border-radius); border: var(--dri-thumb-border-width) solid var(--dri-thumb-border-color); box-shadow: none; box-sizing: border-box; width: var(--dri-thumb-width); height: var(--dri-thumb-height);}\n" +
            "input:hover::-moz-range-thumb {background-color: var(--dri-thumb-hover-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            "input:active::-moz-range-thumb {background-color: var(--dri-thumb-active-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            "input:focus-visible::-moz-range-thumb {background-color: var(--dri-thumb-active-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            // webkit
            "input::-webkit-slider-runnable-track {width: 100%; height: var(--dri-track-height); cursor: pointer; }\n" +
            "input:first-child::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--dri-track-color) var(--dri-position-0), var(--dri-track-filled-color) var(--dri-position-0), var(--dri-track-filled-color)); }\n" +
            "input:last-child::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--dri-track-filled-color) var(--dri-position-1), var(--dri-track-color) var(--dri-position-1), var(--dri-track-color)); }\n" +
            "input::-webkit-slider-thumb { -webkit-appearance: none; margin-top: calc(var(--dri-track-height) / 2); transform: translateY(-50%); background-color: var(--dri-thumb-color); border-radius: var(--dri-thumb-border-radius); border: var(--dri-thumb-border-width) solid var(--dri-thumb-border-color); box-shadow: none; box-sizing: border-box; width: var(--dri-thumb-width); height: var(--dri-thumb-height);}\n" +
            "input:hover::-webkit-slider-thumb {background-color: var(--dri-thumb-hover-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            "input:active::-webkit-slider-thumb {background-color: var(--dri-thumb-active-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            "input:focus-visible::-webkit-slider-thumb {background-color: var(--dri-thumb-active-color); border-color: var(--dri-thumb-border-hover-color); }\n" +
            // disabled state
            "input:first-child:disabled::-moz-range-track { background: linear-gradient(to right, var(--dri-track-color) var(--dri-position-0), var(--dri-track-filled-color-disabled) var(--dri-position-0), var(--dri-track-filled-color-disabled)); }\n" +
            "input:last-child:disabled::-moz-range-track { background: linear-gradient(to right, var(--dri-track-filled-color-disabled) var(--dri-position-1), var(--dri-track-color) var(--dri-position-1), var(--dri-track-color)); }\n" + 
            "input:disabled:hover::-moz-range-thumb {background-color: var(--dri-thumb-disabled-color); }\n" +
            "input:disabled:active::-moz-range-thumb {background-color: var(--dri-thumb-disabled-color);  }\n" +
            "input:disabled:focus-visible::-moz-range-thumb {background-color: var(--dri-thumb-disabled-color);  }\n" +
            "input:first-child:disabled::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--dri-track-color) var(--dri-position-0), var(--dri-track-filled-color-disabled) var(--dri-position-0), var(--dri-track-filled-color-disabled)); }\n" +
            "input:last-child:disabled::-webkit-slider-runnable-track { background: linear-gradient(to right, var(--dri-track-filled-color-disabled) var(--dri-position-1), var(--dri-track-color) var(--dri-position-1), var(--dri-track-color)); }\n" +
            "input:disabled:hover::-webkit-slider-thumb {background-color: var(--dri-thumb-disabled-color); }\n" +
            "input:disabled:active::-webkit-slider-thumb {background-color: var(--dri-thumb-disabled-color);  }\n" +
            "input:disabled:focus-visible::-webkit-slider-thumb {background-color: var(--dri-thumb-disabled-color);  }\n" +
            "input:disabled:hover {cursor: not-allowed}\n" + 
            // tooltip
            ".slider-tooltip {position: absolute; position-area: top center; z-index: var(--dri-tooltip-z-index); }\n" +
            "input:first-child::-moz-range-thumb { anchor-name: --thumb1; }\n" +
            "input:first-child::-webkit-slider-thumb { anchor-name: --thumb1; }\n" +
            "input:last-child::-moz-range-thumb { anchor-name: --thumb2; }\n" +
            "input:last-child::-webkit-slider-thumb { anchor-name: --thumb2; }\n" +
            ".tt1 {position-anchor: --thumb1; }\n" +
            ".tt2 {position-anchor: --thumb2; }\n" +
            ".hidden {display: none;}";
        const shadow: ShadowRoot = this.attachShadow({mode: "open", delegatesFocus: true});
        shadow.appendChild(style);
        const container = createElement("div", {parent: shadow});
        const sliderContainer = createElement("div", {parent: container, classes: "slider-container"});
        this.#sliderContainer = sliderContainer;
        const min = createElement("input", {attributes: {type: "range"}, parent: sliderContainer});
        const max = createElement("input", {attributes: {type: "range"}, parent: sliderContainer});
        const minVal = this.#range[0];
        const maxVal = this.#range[1];
        const midVal = this.#midPoint;
        min.min = minVal.toString();
        min.max = midVal.toString();
        max.min = midVal.toString();
        max.max = maxVal.toString();
        min.style.width = "calc(50% + var(--dri-thumb-width))";
        max.style.width = "calc(50% + var(--dri-thumb-width))";
        min.value = min.min;
        max.value = max.max;
        this.#min = min;
        this.#max = max;
        this.#inputs = [min, max];
        const changeListener = this.changed.bind(this);
        min.addEventListener("input", changeListener);
        max.addEventListener("input", changeListener);
        min.addEventListener("change", changeListener);
        max.addEventListener("change", changeListener);
        this.#interactionStartListener = this.#interactionStart.bind(this);
        this.#interactionEndListener = this.#interactionEnd.bind(this);
        this.#tooltip1 = createElement("div", {parent: shadow, classes: ["slider-tooltip", "tt1", "hidden"]});
        this.#tooltip2 = createElement("div", {parent: shadow, classes: ["slider-tooltip", "tt2", "hidden"]});
        this.#tooltips = [this.#tooltip1, this.#tooltip2];
        this.#hoverStartListener = this.#hoverStart.bind(this);
        this.#hoverEndListener = this.#hoverEnd.bind(this);
        this.#hoverMoveListener = this.#hoverMove.bind(this);
        this.#hoverTooltip = createElement("div", {parent: shadow, classes: ["slider-tooltip", "hidden"]});
        [this.#tooltip1, this.#tooltip2, this.#hoverTooltip].forEach(tt => createElement("output", {parent: tt}));
    }

    changed(event: Event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        event.stopPropagation();
        const min = parseFloat(this.#min.value);
        const max = parseFloat(this.#max.value);
        if (min === this.#values[0] && max === this.#values[1]) {
            this.#dispatch(event.type as "input"|"change");
            return;
        }
        const center = this.#findMidpoint(parseFloat(this.#min.min), min, max, this.step);
        if (Number.isFinite(center)) {
            this.#setMidpoint(center, min, max);
            if (this.#interactionActive) {
                const formatter = this.#tooltipFormatter;
                if (formatter) {
                    DoubleRangeSlider.#setTooltipContent(this.#tooltip1, formatter(min));
                    DoubleRangeSlider.#setTooltipContent(this.#tooltip2, formatter(max));
                    if (!DoubleRangeSlider.#SUPPORTS_ANCHOR) {
                        DoubleRangeSlider.#setTooltipPosition(this.#tooltip1, this.#min, min);
                        DoubleRangeSlider.#setTooltipPosition(this.#tooltip2, this.#max, max);
                    }
                }
            }
            this.#dispatch(event.type as "input"|"change");
        }
    }

    static #setTooltipContent(tt: HTMLElement, content: string|HTMLElement) {
        const out: HTMLOutputElement = tt.querySelector("output")!;
        while (out.firstChild)
            out.firstChild.remove();
        if (content instanceof HTMLElement)
            out.appendChild(content);
        else
            out.textContent = content;
    }

    #enableTooltip() {
        this.#inputs.forEach(inp => {
            if (this.#ttClick) {
                inp.addEventListener("pointerdown", this.#interactionStartListener);
                inp.addEventListener("pointerup", this.#interactionEndListener);
            }
            if (this.#ttHover) {
                inp.addEventListener("pointerenter", this.#hoverStartListener);
                inp.addEventListener("pointerleave", this.#hoverEndListener);
            }
        });
    }

    #disableTooltip() {
        this.#inputs.forEach(inp => {
            inp.removeEventListener("pointerdown", this.#interactionStartListener);
            inp.removeEventListener("pointerup", this.#interactionEndListener);
            inp.removeEventListener("pointerenter", this.#hoverStartListener);
            inp.removeEventListener("pointerleave", this.#hoverEndListener);
        });
        this.#hoverEnd();
        this.#interactionEnd();
    }

    #interactionStart() {
        if (this.disabled)
            return;
        const formatter = this.#tooltipFormatter;
        if (formatter) {
            const [min, max] = this.#values;
            DoubleRangeSlider.#setTooltipContent(this.#tooltip1, formatter(min));
            DoubleRangeSlider.#setTooltipContent(this.#tooltip2, formatter(max));
            this.#interactionActive = true;
            if (!DoubleRangeSlider.#SUPPORTS_ANCHOR) {
                DoubleRangeSlider.#setTooltipPosition(this.#tooltip1, this.#min, min);
                DoubleRangeSlider.#setTooltipPosition(this.#tooltip2, this.#max, max);
            }
            this.#tooltips.forEach(t => t.classList.remove("hidden"));
        }
        this.#hoverEnd();
    }

    static #setTooltipPosition(tooltip: HTMLElement, range: HTMLInputElement, value: number) {
        const l = parseFloat(range.min);
        const u = parseFloat(range.max);
        const frac = (value-l)/(u-l);
        if (isFinite(frac)) {
            const box = range.getBoundingClientRect();
            const pos = box.x + frac * box.width;
            tooltip.style.left = pos + "px";
            tooltip.style.top = `calc(${box.y}px - 0.5 * var(--dri-thumb-height) - 1em)`;
        }
    }

    #interactionEnd() {
        this.#interactionActive = false;
        this.#tooltips.forEach(t => t.classList.add("hidden"));
    }

    #hoverStart(event: PointerEvent) {
        if (this.#interactionActive || this.disabled)
            return;
        const formatter = this.#tooltipFormatter;
        if (formatter) {
            this.#hoverActive = true;
            this.#hoverMove(event);
            this.#hoverTooltip.classList.remove("hidden");
            const inp = event.currentTarget as HTMLInputElement;
            inp.addEventListener("pointermove", this.#hoverMoveListener);
        }
    }

    #hoverMove(event: PointerEvent) {
        const formatter = this.#tooltipFormatter;
        if (!this.#hoverActive || !formatter)
            return;
        const inp = event.currentTarget as HTMLInputElement;
        const min = parseFloat(inp?.min);
        const max = parseFloat(inp?.max);
        if (isFinite(min) && isFinite(max)) {
            //const rect: DOMRect = (event.currentTarget as HTMLElement).getClientRects()[0];
            const rect: DOMRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
            const left = rect.x;
            const right = rect.x + rect.width;
            // not in range 0..1 !
            const frac = (event.clientX - left)/(right-left) || 0;
            const value = min + frac * (max-min);
            DoubleRangeSlider.#setTooltipContent(this.#hoverTooltip, formatter(value));
            this.#hoverTooltip.style.left = event.clientX + "px";
            this.#hoverTooltip.style.top = (rect.top - 20) + "px";
        }
    }

    #hoverEnd() {
        this.#hoverActive = false;
        this.#hoverTooltip.classList.add("hidden");
        this.#inputs.forEach(inp => inp.removeEventListener("pointermove", this.#hoverMoveListener));
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
        case "disabled":
            if (newValue !== null) {
                this.#min.setAttribute(name, newValue);
                this.#max.setAttribute(name, newValue);
                if (name === "disabled")
                    this.#interactionEnd();
            } else {
                this.#min.removeAttribute(name);
                this.#max.removeAttribute(name);
            }
            break;
        }
    }

    #setRangeInternal(min: number, max: number, options?: {selectedValues?: [number, number]}) {
        if (options?.selectedValues) {
            const v: [number, number] = options!.selectedValues;
            if (v.length !== 2)
                throw new Error("Array of length != 2 passed: " + v)
            if (v.findIndex(v => !Number.isFinite(v)) >= 0)
                throw new Error("Invalid number passed: " + v);
            if (v.findIndex(v => v < min || v > max) >= 0)
                throw new Error("Selected values " + v + " not in range: " + [min, max]);
            this.#values = [...v];
        }
        const selectedRange = this.getValues();
        const newSelected = [selectedRange[0] >= min && selectedRange[0] <= max ? selectedRange[0] : min,
            selectedRange[1] >= min && selectedRange[1] <= max ? selectedRange[1] : max];
        this.#range[0] = min!;
        this.#range[1] = max!;
        this.#min.min = min.toString();
        this.#max.max = max.toString();
        this.#adaptRange(newSelected[0], newSelected[1], {setLower: true, setUpper: true});
    }

    #setMidpoint(midPoint: number, valueMin: number, valueMax: number) {
        this.#midPoint = midPoint;
        this.#values = [valueMin, valueMax];
        this.#min.max = midPoint.toString();
        this.#max.min = midPoint.toString();
        this.#midPoint = midPoint;
        const range = this.#range[1] - this.#range[0];
        const minPercentage = ((midPoint - this.#range[0])/range * 100) || 0;
        const maxPercentage = ((this.#range[1] - midPoint)/range * 100) || 0;
        this.#min.style.width = `calc(${minPercentage}% + var(--dri-thumb-width))`;
        this.#max.style.width = `calc(${maxPercentage}% + var(--dri-thumb-width))`;
        const sliderPos0 = (valueMin-this.#range[0])/(midPoint - this.#range[0])*100;
        const sliderPos1 = (valueMax-midPoint)/(this.#range[1] - midPoint)*100;

        this.#sliderContainer.style.setProperty("--dri-position-0", `${sliderPos0}%`);
        this.#sliderContainer.style.setProperty("--dri-position-1", `${sliderPos1}%`);
    }

    #adaptRange(valueMin: number, valueMax: number, options?: {setLower?: boolean; setUpper?: boolean;}) {
        const midPoint = this.#findMidpoint(this.min, valueMin, valueMax, this.step);
        this.#setMidpoint(midPoint, valueMin, valueMax);
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
        return [...this.#values];
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

    set step(step: number|undefined) {
        if (step === undefined)
            this.setAttribute("step", "any");
        else if (Number.isFinite(step) && step > 0)
            this.setAttribute("step", step.toString());
        else
            throw new Error(`Invalid step ${step}`);
    }

    get step(): number|undefined {
        const step = this.#min.getAttribute("step");
        if (step === "any")
            return undefined;
        return parseFloat(step!) || 1;
    }

    get disabled(): boolean {
        return !!this.getAttribute("disabled");
    }

    set disabled(disabled: boolean) {
        if (disabled)
            this.setAttribute("disabled", "disabled");
        else
            this.removeAttribute("disabled");
    }

    setRange(min: number, max: number, options?: {selectedValues?: [number, number]; step?: number;}) {
        if (options?.step !== undefined)
            this.step = options?.step;
        this.#setRangeInternal(min, max, options);
    }

    setValues(lower: number, upper: number) {
        if (!Number.isFinite(lower) || !Number.isFinite(upper)) 
            throw new Error("Invalid numbers "+ lower + " - " + upper);
        if (lower > upper)
            throw new Error("Lower range greater than upper: " + lower + " - " + upper);
        const [min, max] = this.#range;
        if (lower < min)
            lower = min;
        if (upper > max)
            upper = max;
        this.#adaptRange(lower, upper, {setLower: true, setUpper: true});
    }

    getTooltipFormatter(): ((data: number) => string|HTMLElement)|undefined {
        return this.#tooltipFormatter;
    }

    setTooltipFormatter(f: ((data: number) => string|HTMLElement)|undefined, options?: {hoverActive?: boolean; clickActive?: boolean;}) {
        if (!f) {
            this.#disableTooltip();
        } else {
            if (typeof f !== "function")
                throw new Error("Unsupported formatter, must be a function of the numeric value.")
            this.#ttHover = typeof options?.hoverActive === "undefined" ? true : options.hoverActive!;
            this.#ttClick = typeof options?.clickActive === "undefined" ? true : options.clickActive!;
            this.#enableTooltip();
        }
        this.#tooltipFormatter = f;

    }

}

function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions&{
    text?: string;
    title?: string;
    id?: string;
    classes?: string|Array<string>;
    role?: string;
    attributes?: Record<string, string>;
    css?: Record<string, string>;
    parent?: Node;
}): HTMLElementTagNameMap[K] {
    const el: HTMLElementTagNameMap[K] = document.createElement(tagName, options);
    if (options?.text) {
        if (tagName === "input")
            (el as HTMLInputElement).value = options.text;
        else
            el.textContent = options?.text;
    }
    if (options?.title)
        el.title = options.title;
    if (options?.classes) {
        if (typeof options.classes === "string")
            el.classList.add(options.classes)
        else
            options.classes.forEach(cl => el.classList.add(cl));
    }
    if (options?.id)  // TODO some base id + sensible suffix
        el.id = options.id;
    if (options?.role)
        el.role = options?.role;
    if (options?.attributes)
        Object.entries(options.attributes).forEach(([key, value]) => el.setAttribute(key, value));
    if (options?.css)
       Object.entries(options.css).forEach(([key, value]) => el.style.setProperty(key, value));
    options?.parent?.appendChild(el);
    return el;
}

