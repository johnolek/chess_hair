class Config {
    constructor(namespace = 'config') {
        this.namespace = namespace;
        this.typeData = {}
        if (!localStorage.getItem(this.namespace)) {
            localStorage.setItem(this.namespace, JSON.stringify({}));
        }
    }

    get(key, defaultValue = null) {
        const storedData = JSON.parse(localStorage.getItem(this.namespace));
        if (!this.typeData[key]) {
            this.typeData[key] = {
                type: 'text',
                values: null
            }
        }
        if (key in storedData) {
            const storedValue = storedData[key];
            if (typeof defaultValue === 'number') {
                this.typeData[key].type = 'number';
                return Number(storedValue);
            } else {
                return storedValue;
            }
        } else {
            this.set(key, defaultValue);
            return defaultValue;
        }
    }

    set(key, value) {
        if (typeof key !== 'string') {
            throw new Error('Key must be a string');
        }
        const storedData = JSON.parse(localStorage.getItem(this.namespace));
        storedData[key] = value;
        localStorage.setItem(this.namespace, JSON.stringify(storedData));
    }

    setAllowedValuesForKey(key, values) {
        this.typeData[key].values = values;
    }

    addConfigLink(linkText) {
        const link = document.createElement('a');
        link.textContent = linkText;
        link.style.position = 'absolute';
        link.style.top = '0';
        link.style.right = '0';
        link.addEventListener('click', (event) => {
            event.preventDefault();
            link.style.display = 'none';
            const form = this.generateForm();
            form.style.position = 'absolute';
            form.style.top = '0';
            form.style.right = '0';
            document.body.appendChild(form);
        });
        document.body.appendChild(link);
    }

    generateForm() {
        const form = document.createElement('form');
        const storedData = JSON.parse(localStorage.getItem(this.namespace));
        for (const key in this.typeData) {
            const container = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = key;
            container.appendChild(label);
            let input;
            if (this.typeData[key].values && this.typeData[key].values.length > 0) {
                input = document.createElement('select');
                this.typeData[key].values.forEach(value => {
                    const option = document.createElement('option');
                    option.value = value;
                    option.textContent = value;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');
                input.type = this.typeData[key].type;
            }
            input.value = storedData[key] || '';
            input.name = key;
            container.appendChild(input);
            form.appendChild(container);
        }
        const submitButton = document.createElement('input');
        submitButton.type = 'submit';
        submitButton.value = 'Submit';
        form.appendChild(submitButton);
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            for (const [key, value] of formData.entries()) {
                this.set(key, value);
            }
            form.parentNode.removeChild(form);
            this.addConfigLink('config');
        });
        return form;
    }
}

export default Config;
