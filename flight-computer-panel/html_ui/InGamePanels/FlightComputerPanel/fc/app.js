// Application shell: tabs, SVG viewport, drag/wheel handling, zoom, step buttons, persistence.
// A face is an object with:
//   id, title
//   build(group)            draw the dials into an SVG group
//   pick(pt)                -> handle {start(pt), move(pt), nudge(dir, fine)} or null for a point (svg units)
//   focus()                 -> {x, y} point the zoom follows
//   rows()                  -> [{label, value(), step(dir, fine)}]   stepper rows
//   buildPanel(container), refresh()   optional extra widgets
//   readout()               -> array of html strings
//   getState(), setState(s)
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};
    var core = FC.core, svg = FC.svg;
    var EXTENT = 106;
    var ZOOMS = [1, 1.7, 2.8, 4.5];
    var STORE_KEY = 'fc.state.v1';

    // ---- Small helpers ----

    function h(tag, cls, text, parent) {
        var node = document.createElement(tag);
        if (cls) { node.className = cls; }
        if (text !== undefined) { node.textContent = text; }
        if (parent) { parent.appendChild(node); }
        return node;
    }
    FC.h = h;

    // About 3 significant digits, which is what a slide rule can honestly give.
    FC.fmt = function (v) {
        if (!isFinite(v)) { return '—'; }
        var a = Math.abs(v);
        if (a >= 100) { return String(Math.round(v)); }
        return String(parseFloat(v.toPrecision(3)));
    };

    // Press-and-hold repeat for step buttons.
    function holdButton(btn, fn) {
        var timer = null, repeat = null;
        function stop() {
            if (timer) { clearTimeout(timer); timer = null; }
            if (repeat) { clearInterval(repeat); repeat = null; }
        }
        btn.addEventListener('mousedown', function (e) {
            e.preventDefault();
            fn();
            stop();
            timer = setTimeout(function () { repeat = setInterval(fn, 90); }, 420);
        });
        ['mouseup', 'mouseleave', 'blur'].forEach(function (ev) { btn.addEventListener(ev, stop); });
        document.addEventListener('mouseup', stop);
    }
    FC.holdButton = holdButton;

    // Handle that turns a dial with the pointer. onChange(dialAngle) is called on every move.
    FC.rotateHandle = function (getAngle, setAngle, nudgeDeg) {
        var a0 = 0, base = 0;
        return {
            start: function (pt) { a0 = svg.angleOf(pt.x, pt.y); base = getAngle(); },
            move: function (pt) { setAngle(base + core.norm180(svg.angleOf(pt.x, pt.y) - a0)); },
            nudge: function (dir, fine) { setAngle(getAngle() + dir * (fine ? nudgeDeg / 10 : nudgeDeg)); }
        };
    };

    // ---- Persistence ----

    var store = FC.store = {
        read: function () {
            var raw = null;
            try {
                if (typeof GetStoredData === 'function') { raw = GetStoredData(STORE_KEY); }
            } catch (e) { raw = null; }
            try {
                if (!raw && g.localStorage) { raw = g.localStorage.getItem(STORE_KEY); }
            } catch (e) { raw = null; }
            try { return raw ? JSON.parse(raw) : {}; } catch (e) { return {}; }
        },
        write: function (state) {
            var raw = JSON.stringify(state);
            try { if (typeof SetStoredData === 'function') { SetStoredData(STORE_KEY, raw); } } catch (e) { /* ignore */ }
            try { if (g.localStorage) { g.localStorage.setItem(STORE_KEY, raw); } } catch (e) { /* ignore */ }
        }
    };

    // ---- App ----

    function App(root) {
        var self = this;
        this.root = root;
        this.faces = [];
        this.active = null;
        this.zoomIndex = 0;
        this.fine = false;
        this.drag = null;
        this.saveTimer = null;
        var saved = store.read();
        this.saved = saved;

        root.className = 'fc-root';
        var bar = h('div', 'fc-bar');
        this.tabsEl = h('div', 'fc-tabs');
        bar.appendChild(this.tabsEl);
        var tools = h('div', 'fc-tools');
        this.zoomOut = h('button', 'fc-btn', '−');
        this.zoomOut.title = 'Zoom out';
        this.zoomLabel = h('span', 'fc-zoomlabel', '1×');
        this.zoomIn = h('button', 'fc-btn', '+');
        this.zoomIn.title = 'Zoom in';
        this.fineBtn = h('button', 'fc-btn fc-wide', 'Coarse');
        this.fineBtn.title = 'Step size of the + / − buttons and the mouse wheel';
        [this.zoomOut, this.zoomLabel, this.zoomIn, this.fineBtn].forEach(function (n) { tools.appendChild(n); });
        bar.appendChild(tools);
        root.appendChild(bar);

        var main = h('div', 'fc-main');
        this.dialEl = h('div', 'fc-dial');
        this.side = h('div', 'fc-side');
        main.appendChild(this.dialEl);
        main.appendChild(this.side);
        root.appendChild(main);

        this.svgEl = svg.el(this.dialEl, 'svg', { xmlns: 'http://www.w3.org/2000/svg', preserveAspectRatio: 'xMidYMid meet' });
        this.svgEl.setAttribute('class', 'fc-svg');
        this.setView(0, 0);

        this.readoutEl = h('div', 'fc-readout');
        this.panelEl = h('div', 'fc-panel');
        this.rowsEl = h('div', 'fc-rows');
        this.side.appendChild(this.readoutEl);
        this.side.appendChild(this.panelEl);
        this.side.appendChild(this.rowsEl);

        holdButton(this.zoomIn, function () { self.setZoom(self.zoomIndex + 1); });
        holdButton(this.zoomOut, function () { self.setZoom(self.zoomIndex - 1); });
        this.fineBtn.addEventListener('click', function () { self.setFine(!self.fine); });

        this.svgEl.addEventListener('mousedown', function (e) { self.onDown(e); });
        document.addEventListener('mousemove', function (e) { self.onMove(e); });
        document.addEventListener('mouseup', function () { self.onUp(); });
        this.svgEl.addEventListener('wheel', function (e) { self.onWheel(e); });
    }
    FC.App = App;

    App.prototype.addFace = function (face) {
        var self = this;
        face.app = this;
        var group = svg.el(null, 'g', { 'class': 'fc-face', id: 'face-' + face.id });
        face.build(group);
        face.group = group;
        this.svgEl.appendChild(group);
        group.style.display = 'none';
        var btn = h('button', 'fc-tab', face.title);
        btn.addEventListener('click', function () { self.show(face); });
        this.tabsEl.appendChild(btn);
        face.tab = btn;
        this.faces.push(face);
        if (this.saved && this.saved[face.id]) { face.setState(this.saved[face.id]); }
    };

    App.prototype.start = function () {
        var s = this.saved || {};
        var wanted = this.faces[0];
        for (var i = 0; i < this.faces.length; i++) {
            if (this.faces[i].id === s.face) { wanted = this.faces[i]; }
        }
        if (typeof s.zoom === 'number') { this.zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, s.zoom)); }
        this.setFine(!!s.fine, true);
        this.show(wanted);
    };

    App.prototype.show = function (face) {
        if (this.active) {
            this.active.group.style.display = 'none';
            this.active.tab.className = 'fc-tab';
        }
        this.active = face;
        face.group.style.display = '';
        face.tab.className = 'fc-tab fc-active';
        this.panelEl.innerHTML = '';
        if (face.buildPanel) { face.buildPanel(this.panelEl); }
        this.buildRows();
        this.update();
    };

    App.prototype.buildRows = function () {
        var self = this;
        this.rowsEl.innerHTML = '';
        this.rowValues = [];
        this.active.rows().forEach(function (row) {
            var el = h('div', 'fc-row');
            h('span', 'fc-rowlabel', row.label, el);
            var val = h('span', 'fc-rowvalue', '', el);
            var minus = h('button', 'fc-btn fc-step', '−', el);
            var plus = h('button', 'fc-btn fc-step', '+', el);
            holdButton(minus, function () { row.step(-1, self.fine); self.update(); });
            holdButton(plus, function () { row.step(1, self.fine); self.update(); });
            self.rowsEl.appendChild(el);
            self.rowValues.push({ el: val, row: row });
        });
    };

    // Redraw readouts after any state change.
    App.prototype.update = function () {
        var face = this.active;
        if (!face) { return; }
        if (face.refresh) { face.refresh(); }
        this.rowValues.forEach(function (rv) { rv.el.textContent = rv.row.value(); });
        this.readoutEl.innerHTML = face.readout().join('');
        this.applyView();
        this.scheduleSave();
    };

    App.prototype.setZoom = function (i) {
        this.zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, i));
        this.update();
    };

    App.prototype.setFine = function (fine, quiet) {
        this.fine = fine;
        this.fineBtn.textContent = fine ? 'Fine' : 'Coarse';
        this.fineBtn.className = 'fc-btn fc-wide' + (fine ? ' fc-on' : '');
        if (!quiet) { this.scheduleSave(); }
    };

    App.prototype.setView = function (cx, cy) {
        var z = ZOOMS[this.zoomIndex];
        var half = EXTENT / z;
        cx = Math.max(-EXTENT + half, Math.min(EXTENT - half, cx));
        cy = Math.max(-EXTENT + half, Math.min(EXTENT - half, cy));
        this.svgEl.setAttribute('viewBox', (cx - half) + ' ' + (cy - half) + ' ' + (2 * half) + ' ' + (2 * half));
    };

    App.prototype.applyView = function () {
        var f = this.active && this.active.focus ? this.active.focus() : { x: 0, y: 0 };
        this.zoomLabel.textContent = ZOOMS[this.zoomIndex] + '×';
        this.setView(this.zoomIndex === 0 ? 0 : f.x, this.zoomIndex === 0 ? 0 : f.y);
    };

    App.prototype.toSvg = function (e) {
        var ctm = this.svgEl.getScreenCTM();
        if (!ctm) { return { x: 0, y: 0 }; }
        var p = this.svgEl.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        var q = p.matrixTransform(ctm.inverse());
        return { x: q.x, y: q.y };
    };

    App.prototype.onDown = function (e) {
        if (e.button !== undefined && e.button !== 0) { return; }
        e.preventDefault();
        var pt = this.toSvg(e);
        var handle = this.active.pick(pt);
        if (!handle) { return; }
        this.drag = handle;
        if (handle.start) { handle.start(pt); }
        if (handle.move) { handle.move(pt); }
        this.update();
    };

    App.prototype.onMove = function (e) {
        if (!this.drag) { return; }
        this.drag.move(this.toSvg(e));
        this.update();
    };

    App.prototype.onUp = function () {
        this.drag = null;
    };

    App.prototype.onWheel = function (e) {
        var handle = this.active.pick(this.toSvg(e));
        if (!handle || !handle.nudge) { return; }
        e.preventDefault();
        handle.nudge(e.deltaY < 0 ? 1 : -1, this.fine);
        this.update();
    };

    App.prototype.scheduleSave = function () {
        var self = this;
        if (this.saveTimer) { clearTimeout(this.saveTimer); }
        this.saveTimer = setTimeout(function () {
            var state = { face: self.active ? self.active.id : null, zoom: self.zoomIndex, fine: self.fine };
            self.faces.forEach(function (f) { state[f.id] = f.getState(); });
            store.write(state);
        }, 400);
    };
})(typeof window !== 'undefined' ? window : this);
