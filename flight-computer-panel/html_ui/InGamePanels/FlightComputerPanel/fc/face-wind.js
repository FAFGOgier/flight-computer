// Wind face: rotating compass ring (course under the top index) and a course-up plotting board.
// The wind dot sits where the wind blows TO. A circle of radius TAS around the dot cuts the
// track axis (vertical line) at the ground speed, and the line dot -> cut is the air vector,
// whose angle from the axis is the wind correction angle.
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};
    var core = FC.core, svg = FC.svg, fmt = FC.fmt;
    var PLOT_R = 80, PLOT_SCALE_R = 78;
    var RANGES = [100, 200, 400, 800];

    function pad3(v) {
        var n = Math.round(core.norm360(v)) % 360;
        return (n < 100 ? (n < 10 ? '00' : '0') : '') + n;
    }

    function WindFace() {
        this.id = 'wind';
        this.title = 'Wind';
        this.course = 90;
        this.tas = 120;
        this.windFrom = 330;
        this.windSpeed = 20;
        this.range = 200;
    }

    WindFace.prototype.build = function (g0) {
        var self = this;
        var font = 'Roboto, Arial, sans-serif';
        svg.el(g0, 'circle', { r: 100, fill: '#dde8d6', stroke: '#333', 'stroke-width': 0.8 });
        var defs = svg.el(g0, 'defs');
        var clip = svg.el(defs, 'clipPath', { id: 'fc-plotclip' });
        svg.el(clip, 'circle', { r: PLOT_R });

        this.plotG = svg.el(g0, 'g');

        this.ringG = svg.el(g0, 'g');
        svg.el(this.ringG, 'circle', { r: 82, fill: 'none', stroke: '#555', 'stroke-width': 0.3 });
        var minor = '', major = '';
        for (var a = 0; a < 360; a += 5) {
            var isMajor = a % 10 === 0;
            var p = svg.pt(82, a), q = svg.pt(82 + (isMajor ? 4.5 : 2.6), a);
            var seg = 'M' + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + 'L' + q.x.toFixed(2) + ' ' + q.y.toFixed(2);
            if (isMajor) { major += seg; } else { minor += seg; }
        }
        svg.el(this.ringG, 'path', { d: minor, stroke: '#222', 'stroke-width': 0.3, fill: 'none' });
        svg.el(this.ringG, 'path', { d: major, stroke: '#222', 'stroke-width': 0.5, fill: 'none' });
        var names = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
        for (var d = 0; d < 360; d += 30) {
            var label = names[d] !== undefined ? names[d] : String(d / 10);
            svg.el(this.ringG, 'text', {
                transform: 'rotate(' + d + ') translate(0,' + (-92.5) + ')',
                'text-anchor': 'middle', dy: '0.35em', 'font-size': 5, 'font-weight': names[d] ? 'bold' : 'normal',
                fill: names[d] ? '#b71c1c' : '#222', 'font-family': font
            }, label);
        }

        svg.el(g0, 'path', { d: 'M-3.2 -104.5 L3.2 -104.5 L0 -98.5 Z', fill: '#d11', stroke: '#fff', 'stroke-width': 0.4 });
        this.applyRing();
    };

    WindFace.prototype.applyRing = function () {
        this.ringG.setAttribute('transform', 'rotate(' + (-this.course).toFixed(2) + ')');
    };

    WindFace.prototype.k = function () { return PLOT_SCALE_R / this.range; };

    // Position of the wind dot in the course-up frame.
    WindFace.prototype.windPoint = function () {
        return svg.pt(this.windSpeed * this.k(), this.windFrom + 180 - this.course);
    };

    WindFace.prototype.refresh = function () {
        var k = this.k(), G = this.plotG, font = 'Roboto, Arial, sans-serif';
        while (G.firstChild) { G.removeChild(G.firstChild); }
        svg.el(G, 'circle', { r: PLOT_R, fill: '#fbfaf2', stroke: '#333', 'stroke-width': 0.5 });
        var inner = svg.el(G, 'g', { 'clip-path': 'url(#fc-plotclip)' });

        for (var i = 1; i <= 4; i++) {
            var r = PLOT_SCALE_R * i / 4;
            svg.el(inner, 'circle', { r: r, fill: 'none', stroke: '#9aa89a', 'stroke-width': 0.25 });
            svg.el(G, 'text', {
                x: 1.5, y: -r + 3.5, 'font-size': 3.2, fill: '#556', 'font-family': font
            }, fmt(this.range * i / 4));
        }
        svg.el(inner, 'line', { x1: -PLOT_R, y1: 0, x2: PLOT_R, y2: 0, stroke: '#9aa89a', 'stroke-width': 0.25 });
        svg.el(inner, 'line', { x1: 0, y1: -PLOT_R, x2: 0, y2: PLOT_R, stroke: '#333', 'stroke-width': 0.5 });

        var wp = this.windPoint();
        var tri = core.windTriangle(this.tas, this.course, this.windFrom, this.windSpeed);
        svg.el(inner, 'circle', {
            cx: wp.x, cy: wp.y, r: this.tas * k, fill: 'none', stroke: '#1565c0', 'stroke-width': 0.5, 'stroke-dasharray': '2 1.4'
        });
        svg.el(inner, 'line', { x1: 0, y1: 0, x2: wp.x, y2: wp.y, stroke: '#ef6c00', 'stroke-width': 0.9 });
        if (tri) {
            var gs = { x: 0, y: -tri.gs * k };
            svg.el(inner, 'line', { x1: wp.x, y1: wp.y, x2: gs.x, y2: gs.y, stroke: '#1565c0', 'stroke-width': 0.9 });
            svg.el(inner, 'line', { x1: 0, y1: 0, x2: gs.x, y2: gs.y, stroke: '#2e7d32', 'stroke-width': 1.2 });
            svg.el(inner, 'circle', { cx: gs.x, cy: gs.y, r: 1.4, fill: '#2e7d32' });
        }
        svg.el(inner, 'circle', { cx: wp.x, cy: wp.y, r: 2.6, fill: '#ef6c00', stroke: '#fff', 'stroke-width': 0.5 });
        svg.el(G, 'text', {
            x: 0, y: 46, 'text-anchor': 'middle', 'font-size': 3.2, fill: '#556', 'font-family': font
        }, 'drag the orange dot: wind');
        this.applyRing();
    };

    WindFace.prototype.pick = function (pt) {
        var self = this, r = Math.sqrt(pt.x * pt.x + pt.y * pt.y);
        if (r > 101) { return null; }
        if (r > PLOT_R + 1) {
            return FC.rotateHandle(function () { return -self.course; }, function (a) {
                self.course = core.norm360(Math.round(-a));
            }, 5);
        }
        return {
            start: function () { },
            move: function (p) {
                var screen = svg.angleOf(p.x, p.y);
                var speed = Math.sqrt(p.x * p.x + p.y * p.y) / self.k();
                self.windSpeed = Math.max(0, Math.min(self.range, Math.round(speed)));
                self.windFrom = core.norm360(Math.round(screen + self.course + 180));
            },
            nudge: function (dir, fine) { self.tas = Math.max(20, self.tas + dir * (fine ? 1 : 5)); }
        };
    };

    WindFace.prototype.focus = function () { return this.windPoint(); };

    WindFace.prototype.rows = function () {
        var self = this;
        function wrap(f) { return core.norm360(f); }
        return [
            { label: 'Course (°)', value: function () { return pad3(self.course); },
              step: function (dir, fine) { self.course = wrap(self.course + dir * (fine ? 1 : 10)); } },
            { label: 'TAS (kt)', value: function () { return String(Math.round(self.tas)); },
              step: function (dir, fine) { self.tas = Math.max(20, self.tas + dir * (fine ? 1 : 10)); } },
            { label: 'Wind from (°)', value: function () { return pad3(self.windFrom); },
              step: function (dir, fine) { self.windFrom = wrap(self.windFrom + dir * (fine ? 1 : 10)); } },
            { label: 'Wind speed (kt)', value: function () { return String(Math.round(self.windSpeed)); },
              step: function (dir, fine) { self.windSpeed = Math.max(0, Math.min(self.range, self.windSpeed + dir * (fine ? 1 : 5))); } },
            { label: 'Board range (kt)', value: function () { return String(self.range); },
              step: function (dir) {
                  var i = Math.max(0, Math.min(RANGES.length - 1, RANGES.indexOf(self.range) + dir));
                  self.range = RANGES[i];
                  self.windSpeed = Math.min(self.windSpeed, self.range);
              } }
        ];
    };

    WindFace.prototype.readout = function () {
        var t = core.windTriangle(this.tas, this.course, this.windFrom, this.windSpeed), lines = [];
        if (!t) {
            lines.push('<div class="fc-big fc-warn">Wind too strong for this TAS</div>');
            return lines;
        }
        var side = t.wca > 0.05 ? ' right' : (t.wca < -0.05 ? ' left' : '');
        lines.push('<div class="fc-big">HDG ' + pad3(t.heading) + '° <span class="fc-arrow">·</span> GS ' + Math.round(t.gs) + ' kt</div>');
        lines.push('<div class="fc-small">WCA ' + Math.abs(t.wca).toFixed(1) + '°' + side + '</div>');
        var head = (t.headwind >= 0 ? 'headwind ' : 'tailwind ') + Math.round(Math.abs(t.headwind)) + ' kt';
        var cross = Math.abs(t.crosswind) < 0.5 ? 'no crosswind' :
            'crosswind ' + Math.round(Math.abs(t.crosswind)) + ' kt from ' + (t.crosswind > 0 ? 'right' : 'left');
        lines.push('<div class="fc-small">' + head + ' · ' + cross + '</div>');
        return lines;
    };

    WindFace.prototype.getState = function () {
        return { course: this.course, tas: this.tas, windFrom: this.windFrom, windSpeed: this.windSpeed, range: this.range };
    };

    WindFace.prototype.setState = function (s) {
        if (!s) { return; }
        if (typeof s.course === 'number') { this.course = core.norm360(s.course); }
        if (s.tas > 0) { this.tas = s.tas; }
        if (typeof s.windFrom === 'number') { this.windFrom = core.norm360(s.windFrom); }
        if (typeof s.windSpeed === 'number' && s.windSpeed >= 0) { this.windSpeed = s.windSpeed; }
        if (RANGES.indexOf(s.range) >= 0) { this.range = s.range; }
    };

    FC.WindFace = WindFace;
})(typeof window !== 'undefined' ? window : this);
