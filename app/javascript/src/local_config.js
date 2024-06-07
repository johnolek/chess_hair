class Config {
    constructor(namespace = 'config') {
        this.namespace = namespace;
        this.configOptions = {};
        if (!localStorage.getItem(this.namespace)) {
            localStorage.setItem(this.namespace, JSON.stringify({}));
        }
    }

    getConfigOption(key, defaultValue = null) {
        if (this.configOptions[key]) {
            return this.configOptions[key];
        }
        this.configOptions[key] = new ConfigOption(key, this, defaultValue);
        return this.configOptions[key];
    }

    get(key) {
        const storedData = JSON.parse(localStorage.getItem(this.namespace));
        if (key in storedData) {
            return storedData[key];
        }
        return null;
    }

    set(key, value) {
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        const storedData = JSON.parse(localStorage.getItem(this.namespace));
        storedData[key] = value;
        localStorage.setItem(this.namespace, JSON.stringify(storedData));
    }

}

class ConfigOption {
    constructor(key, config, defaultValue) {
        this.key = key;
        /** @var Config */
        this.config = config;
        this.defaultValue = defaultValue;
        this.allowedValues = [];
        this.observers = [];
        this.type = 'text';
        if (typeof this.defaultValue === 'number') {
            this.type = 'number'
        }
    }

    getType() {
        return this.type;
    }

    setAllowedValues(array) {
        this.allowedValues = array;
    }

    getAllowedValues() {
        return this.allowedValues;
    }

    getValue() {
        const storedValue = this.config.get(this.key);

        if (storedValue !== null && storedValue !== "") {
            if (this.type === 'number') {
                return parseInt(storedValue);
            }
            return storedValue;
        }

        this.config.set(this.key, this.defaultValue);
        return this.defaultValue;
    }

    setValue(newValue) {
        this.config.set(this.key, newValue);
    }

    getLabel() {
        return this.key;
    }

    addObserver(callback) {
        this.observers.push(callback);
    }

    getObservers() {
        return this.observers;
    }
}

class ConfigForm {
    constructor(config) {
        this.config = config;
    }

    addLinkToDOM(text = null) {
        this.link = this.generateConfigLink(text)
        document.body.appendChild(this.link);
    }

    generateConfigLink(linkText = null) {
        const link = document.createElement('a');
        link.textContent = linkText || 'config';
        link.style.position = 'absolute';
        link.style.top = '0';
        link.style.right = '0';
        link.addEventListener('click', (event) => {
            event.preventDefault();
            link.style.display = 'none';
            this.form = this.generateForm();
            this.form.style.position = 'absolute';
            this.form.style.top = '0';
            this.form.style.right = '0';
            document.body.appendChild(this.form);
        });
        return link;
    }

    generateForm() {
        const form = document.createElement('form');
        for (const key in this.config.configOptions) {
            const option = this.config.getConfigOption(key);
            const container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = option.getLabel();
            container.appendChild(label);
            let input;
            if (option.getAllowedValues().length > 0) {
                input = document.createElement('select');
                option.getAllowedValues().forEach(value => {
                    const selectOption = document.createElement('option');
                    selectOption.value = value;
                    selectOption.textContent = value;
                    selectOption.selected = value === option.getValue();
                    input.appendChild(selectOption);
                });
            } else {
                input = document.createElement('input');
                input.type = option.getType();
            }
            input.name = option.getLabel();
            input.value = option.getValue();
            container.appendChild(input);
            form.appendChild(container);
            input.addEventListener('change', (event) => {
                (option.getObservers()).forEach((callback) => callback(event.target.value));
            });
        }
        const submitButton = document.createElement('input');
        submitButton.type = 'submit';
        submitButton.value = 'Submit';
        form.appendChild(submitButton);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                const option = this.config.getConfigOption(key);
                option.setValue(value);
            }
            form.parentNode.removeChild(form);
            this.link.style.display = null;
        });
        form.style.backgroundColor = 'black';
        form.style.zIndex = '99999';
        return form;
    }
}

export { ConfigForm };
export default Config;
