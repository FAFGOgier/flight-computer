// Calculator face: fixed outer scale, rotating inner disc, hairline cursor.
// The disc obeys  outer = inner * ratio.  Modes only differ in how `ratio` is chosen:
//   time    ratio = speed / 60   (inner = minutes, outer = distance)
//   convert ratio = units ratio  (inner = "from" unit, outer = "to" unit)
//   tas     ratio = TAS / CAS    (inner = CAS, outer = TAS)
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};
    var core = FC.core, svg = FC.svg, h = FC.h, fmt = FC.fmt;
    var HUB = 14, EDGE = 81;

    function log10(x) { return Math.log(x) / Math.LN10; }

    // Coarse and fine step for a quantity of this size.
    function stepFor(v, fine) {
        var mag = Math.pow(10, Math.floor(log10(Math.max(Math.abs(v), 1e-6))));
        return fine ? mag / 100 : mag / 10;
    }

    function CalcFace() {
        this.id = 'calc';
        this.title = 'Calc';
        this.mode = 'time';
        this.rate = 120;
        this.cursor = 100;
        this.ratio = 2;
        this.innerAngle = 0;
        this.conv = { cat: 'distance', from: 'nm', to: 'km' };
        this.tas = { pa: 5000, oat: 5 };
        this.tempC = 15;
        this.anim = null;
    }

    CalcFace.prototype.build = function (g0) {
        svg.el(g0, 'circle', { r: 100, fill: '#efe6cc', stroke: '#333', 'stroke-width': 0.8 });
        svg.el(g0, 'circle', { r: 82, fill: 'none', stroke: '#555', 'stroke-width': 0.3 });
        FC.scales.drawLog(g0, 82, 1, { color: '#222' });

        this.innerG = svg.el(g0, 'g');
        svg.el(this.innerG, 'circle', { r: 80, fill: '#f8f3e3', stroke: '#333', 'stroke-width': 0.6 });
        FC.scales.drawLog(this.innerG, 80, -1, { color: '#1b3a6b', special: { 60: '#c62828', 10: '#0277bd' } });
        this.drawHours(this.innerG);
        svg.el(this.innerG, 'text', {
            x: 0, y: 40, 'text-anchor': 'middle', 'font-size': 3.2, fill: '#1b3a6b', 'font-family': 'Roboto, Arial, sans-serif'
        }, 'minutes');

        svg.el(g0, 'circle', { r: HUB, fill: '#d9cfae', stroke: '#333', 'stroke-width': 0.6 });
        svg.el(g0, 'text', {
            'text-anchor': 'middle', y: -1, 'font-size': 3.6, 'font-weight': 'bold', fill: '#333', 'font-family': 'Roboto, Arial, sans-serif'
        }, 'FLIGHT');
        svg.el(g0, 'text', {
            'text-anchor': 'middle', y: 4, 'font-size': 3.6, 'font-weight': 'bold', fill: '#333', 'font-family': 'Roboto, Arial, sans-serif'
        }, 'COMPUTER');

        this.hairG = svg.el(g0, 'g');
        svg.el(this.hairG, 'line', { x1: 0, y1: -HUB, x2: 0, y2: -101, stroke: '#fff', 'stroke-opacity': 0.55, 'stroke-width': 2.2 });
        svg.el(this.hairG, 'line', { x1: 0, y1: -HUB, x2: 0, y2: -101, stroke: '#d11', 'stroke-width': 0.5 });
        svg.el(this.hairG, 'circle', { cx: 0, cy: -102.5, r: 3.2, fill: '#d11', stroke: '#fff', 'stroke-width': 0.6 });
        this.innerAngle = core.ratioToAngle(this.ratio);
        this.applyAngles();
    };

    // Hours scale on the inner disc: 1..9 hours positioned at 60*h minutes.
    CalcFace.prototype.drawHours = function (parent) {
        var R = 64, d = '';
        svg.el(parent, 'circle', { r: R, fill: 'none', stroke: '#8a3b12', 'stroke-width': 0.3 });
        for (var m = 60; m <= 540; m += 10) {
            var a = core.valueToAngle(m), p = svg.pt(R, a), q = svg.pt(R - 2.4, a);
            d += 'M' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + 'L' + q.x.toFixed(2) + ' ' + q.y.toFixed(2);
        }
        svg.el(parent, 'path', { d: d, stroke: '#8a3b12', 'stroke-width': 0.3, fill: 'none' });
        for (var hr = 1; hr <= 9; hr++) {
            var ang = core.valueToAngle(60 * hr);
            svg.el(parent, 'text', {
                transform: 'rotate(' + ang.toFixed(2) + ') translate(0,' + (-(R - 6)) + ')',
                'text-anchor': 'middle', dy: '0.35em', 'font-size': 4.2, 'font-weight': 'bold', fill: '#8a3b12',
                'font-family': 'Roboto, Arial, sans-serif'
            }, String(hr));
        }
        svg.el(parent, 'text', {
            x: 0, y: -44, 'text-anchor': 'middle', 'font-size': 3, fill: '#8a3b12', 'font-family': 'Roboto, Arial, sans-serif'
        }, 'hours');
    };

    CalcFace.prototype.hairAngle = function () { return core.valueToAngle(this.cursor); };

    CalcFace.prototype.applyAngles = function () {
        this.innerG.setAttribute('transform', 'rotate(' + this.innerAngle.toFixed(3) + ')');
        this.hairG.setAttribute('transform', 'rotate(' + this.hairAngle().toFixed(3) + ')');
    };

    // ---- Ratio <-> disc ----

    // Turn the disc so that outer = inner * r. Optionally glide there.
    CalcFace.prototype.setRatio = function (r, animate) {
        var self = this;
        this.ratio = r;
        if (this.mode === 'time') { this.rate = r * 60; }
        var target = core.ratioToAngle(r);
        this.cancelAnim();
        if (!animate) {
            this.innerAngle = target;
            this.applyAngles();
            return;
        }
        var from = this.innerAngle, delta = core.norm180(target - from), t0 = Date.now(), dur = 380;
        var anim = this.anim = { live: true };
        (function tick() {
            if (!anim.live) { return; }
            var k = Math.min(1, (Date.now() - t0) / dur);
            k = 1 - Math.pow(1 - k, 3);
            self.innerAngle = core.norm360(from + delta * k);
            self.applyAngles();
            self.app.update();
            if (k < 1) { setTimeout(tick, 16); } else { self.anim = null; }
        })();
    };

    CalcFace.prototype.cancelAnim = function () {
        if (this.anim) { this.anim.live = false; this.anim = null; }
    };

    // The disc was turned by hand: work out the ratio it now represents.
    CalcFace.prototype.setInnerAngle = function (a) {
        this.innerAngle = core.norm360(a);
        var mantissa = Math.pow(10, this.innerAngle / 360);
        this.ratio = core.nearestDecade(mantissa, this.ratio);
        if (this.mode === 'time') { this.rate = this.ratio * 60; }
        this.applyAngles();
    };

    CalcFace.prototype.setCursor = function (v) {
        this.cursor = Math.max(1e-6, v);
        this.applyAngles();
    };

    CalcFace.prototype.inner = function () {
        var m = core.angleToValue(this.hairAngle() - this.innerAngle);
        return core.nearestDecade(m, this.cursor / this.ratio);
    };

    CalcFace.prototype.setInnerValue = function (v) {
        this.setCursor(Math.max(1e-6, v) * this.ratio);
    };

    // ---- Mode plumbing ----

    CalcFace.prototype.ratioForMode = function () {
        if (this.mode === 'time') { return this.rate / 60; }
        if (this.mode === 'convert') { return FC.units.ratio(this.conv.cat, this.conv.from, this.conv.to); }
        return core.tasRatio(this.tas.pa, this.tas.oat);
    };

    CalcFace.prototype.setMode = function (mode) {
        this.mode = mode;
        this.setRatio(this.ratioForMode(), true);
        this.app.show(this);
    };

    CalcFace.prototype.names = function () {
        var U = FC.units.categories[this.conv.cat].units;
        function label(id) { for (var i = 0; i < U.length; i++) { if (U[i].id === id) { return U[i].label; } } return id; }
        if (this.mode === 'time') { return { outer: 'NM', inner: 'min', outerRow: 'Distance', innerRow: 'Time' }; }
        if (this.mode === 'convert') {
            return { outer: label(this.conv.to), inner: label(this.conv.from), outerRow: 'To ' + label(this.conv.to), innerRow: 'From ' + label(this.conv.from) };
        }
        return { outer: 'kt', inner: 'kt', outerRow: 'TAS', innerRow: 'CAS' };
    };

    // ---- Face interface ----

    CalcFace.prototype.pick = function (pt) {
        var self = this, r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
        if (r < HUB) { return null; }
        if (r > EDGE) {
            return FC.rotateHandle(function () { return self.hairAngle(); }, function (a) {
                self.setCursor(core.nearestDecade(core.angleToValue(a), self.cursor));
            }, 2);
        }
        var h0 = FC.rotateHandle(function () { return self.innerAngle; }, function (a) { self.setInnerAngle(a); }, 2);
        var start = h0.start;
        h0.start = function (p) { self.cancelAnim(); start(p); };
        return h0;
    };

    CalcFace.prototype.focus = function () {
        return svg.pt(72, this.hairAngle());
    };

    CalcFace.prototype.rows = function () {
        var self = this, n = this.names(), rows = [];
        if (this.mode === 'time') {
            rows.push({
                label: 'Speed (kt)', value: function () { return fmt(self.rate); },
                step: function (dir, fine) { self.setRatio(Math.max(1, self.rate + dir * stepFor(self.rate, fine)) / 60); }
            });
        }
        rows.push({
            label: n.outerRow + ' (' + n.outer + ')', value: function () { return fmt(self.cursor); },
            step: function (dir, fine) { self.setCursor(self.cursor + dir * stepFor(self.cursor, fine)); }
        });
        rows.push({
            label: n.innerRow + ' (' + n.inner + ')', value: function () { return fmt(self.inner()); },
            step: function (dir, fine) { var v = self.inner(); self.setInnerValue(v + dir * stepFor(v, fine)); }
        });
        if (this.mode === 'tas') {
            rows.push({
                label: 'Pressure alt (ft)', value: function () { return String(self.tas.pa); },
                step: function (dir, fine) { self.tas.pa = Math.max(-1000, Math.min(35000, self.tas.pa + dir * (fine ? 100 : 1000))); self.setRatio(self.ratioForMode()); }
            });
            rows.push({
                label: 'OAT (°C)', value: function () { return String(self.tas.oat); },
                step: function (dir, fine) { self.tas.oat = Math.max(-80, Math.min(60, self.tas.oat + dir * (fine ? 1 : 5))); self.setRatio(self.ratioForMode()); }
            });
        }
        if (this.mode === 'convert') {
            rows.push({
                label: 'Temperature (°C)', value: function () { return self.tempC + ' = ' + fmt(FC.units.cToF(self.tempC)) + ' °F'; },
                step: function (dir, fine) { self.tempC += dir * (fine ? 1 : 5); }
            });
        }
        return rows;
    };

    function group(parent, items, selected, onPick) {
        var wrap = h('div', 'fc-group', undefined, parent);
        items.forEach(function (it) {
            var b = h('button', 'fc-btn fc-chip' + (selected(it.id) ? ' fc-on' : ''), it.label, wrap);
            b.addEventListener('click', function () { onPick(it.id); });
        });
        return wrap;
    }

    CalcFace.prototype.buildPanel = function (panel) {
        var self = this;
        group(panel, [{ id: 'time', label: 'Time' }, { id: 'convert', label: 'Convert' }, { id: 'tas', label: 'TAS' }],
            function (id) { return id === self.mode; }, function (id) { self.setMode(id); });
        if (this.mode === 'convert') {
            var cats = [];
            for (var c in FC.units.categories) { cats.push({ id: c, label: FC.units.categories[c].label }); }
            group(panel, cats, function (id) { return id === self.conv.cat; }, function (id) {
                var u = FC.units.categories[id].units;
                self.conv = { cat: id, from: u[0].id, to: u[1].id };
                self.setRatio(self.ratioForMode(), true);
                self.app.show(self);
            });
            var units = FC.units.categories[this.conv.cat].units;
            h('div', 'fc-hint', 'From (inner disc)  →  To (outer scale)', panel);
            // Picking the unit already used on the other side swaps to the first different one.
            function otherThan(id) {
                for (var i = 0; i < units.length; i++) { if (units[i].id !== id) { return units[i].id; } }
                return id;
            }
            group(panel, units, function (id) { return id === self.conv.from; }, function (id) {
                self.conv.from = id;
                if (self.conv.to === id) { self.conv.to = otherThan(id); }
                self.setRatio(self.ratioForMode(), true);
                self.app.show(self);
            });
            group(panel, units, function (id) { return id === self.conv.to; }, function (id) {
                self.conv.to = id;
                if (self.conv.from === id) { self.conv.from = otherThan(id); }
                self.setRatio(self.ratioForMode(), true);
                self.app.show(self);
            });
        } else if (this.mode === 'tas') {
            var isa = h('button', 'fc-btn fc-chip', 'OAT = ISA', panel);
            isa.addEventListener('click', function () {
                self.tas.oat = Math.round(core.isaTemp(self.tas.pa));
                self.setRatio(self.ratioForMode(), true);
                self.app.update();
            });
        } else {
            h('div', 'fc-hint', 'Red 60 = speed index. Turn the disc to put it under your ground speed.', panel);
        }
    };

    CalcFace.prototype.readout = function () {
        var n = this.names(), O = this.cursor, I = this.inner(), lines = [];
        function big(html) { lines.push('<div class="fc-big">' + html + '</div>'); }
        function small(html) { lines.push('<div class="fc-small">' + html + '</div>'); }
        if (this.mode === 'time') {
            big(fmt(O) + ' NM <span class="fc-arrow">→</span> ' + fmt(I) + ' min');
            small('= ' + core.formatHM(I) + ' h:min at ' + fmt(this.rate) + ' kt');
            small('exact: ' + (O / this.rate * 60).toFixed(1) + ' min');
        } else if (this.mode === 'convert') {
            big(fmt(I) + ' ' + n.inner + ' <span class="fc-arrow">=</span> ' + fmt(O) + ' ' + n.outer);
            small('exact: ' + FC.fmt(I * FC.units.ratio(this.conv.cat, this.conv.from, this.conv.to)) + ' ' + n.outer);
        } else {
            var a = core.airspeed(I, this.tas.pa, this.tas.oat);
            big('CAS ' + fmt(I) + ' <span class="fc-arrow">→</span> TAS ' + fmt(O) + ' kt');
            small('exact: TAS ' + fmt(a.tas) + ' kt · Mach ' + a.mach.toFixed(2));
            small('density altitude ' + Math.round(a.densityAlt / 10) * 10 + ' ft · ISA ' + (a.isaDev >= 0 ? '+' : '') + Math.round(a.isaDev) + '°C');
        }
        return lines;
    };

    CalcFace.prototype.getState = function () {
        return { mode: this.mode, rate: this.rate, cursor: this.cursor, conv: this.conv, tas: this.tas, tempC: this.tempC };
    };

    CalcFace.prototype.setState = function (s) {
        if (!s) { return; }
        if (s.mode) { this.mode = s.mode; }
        if (s.rate > 0) { this.rate = s.rate; }
        if (s.cursor > 0) { this.cursor = s.cursor; }
        if (s.conv && FC.units.categories[s.conv.cat]) { this.conv = s.conv; }
        if (s.tas) { this.tas = s.tas; }
        if (typeof s.tempC === 'number') { this.tempC = s.tempC; }
        this.ratio = this.ratioForMode();
        this.innerAngle = core.ratioToAngle(this.ratio);
        this.applyAngles();
    };

    FC.CalcFace = CalcFace;
})(typeof window !== 'undefined' ? window : this);
