
export function createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions&{
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
