class FlightComputerPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        this.started = false;
        this.ingameUi = null;
    }
    connectedCallback() {
        super.connectedCallback();
        this.ingameUi = this.querySelector('ingame-ui');
        var root = this.querySelector('#fc-root');
        if (root && !this.started) {
            this.started = true;
            FC.mount(root);
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
    }
}
window.customElements.define("ingamepanel-custom", FlightComputerPanel);
checkAutoload();
