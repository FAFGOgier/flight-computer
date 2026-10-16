// SVG helpers and graduation drawing. Angles: 0 at the top, clockwise, in degrees.
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};
    var NS = 'http://www.w3.org/2000/svg';
    var RAD = Math.PI / 180;

    var svg = FC.svg = {};

    svg.el = function (parent, name, attrs, text) {
        var node = document.createElementNS(NS, name);
        if (attrs) {
            for (var k in attrs) {
                if (attrs.hasOwnProperty(k)) { node.setAttribute(k, attrs[k]); }
            }
        }
        if (text !== undefined) { node.textContent = text; }
        if (parent) { parent.appendChild(node); }
        return node;
    };

    // Point at radius r and dial angle a.
    svg.pt = function (r, a) {
        return { x: r * Math.sin(a * RAD), y: -r * Math.cos(a * RAD) };
    };

    // Dial angle of a point.
    svg.angleOf = function (x, y) {
        return FC.core.norm360(Math.atan2(x, -y) / RAD);
    };

    var TICK_LEN = { major: 4.5, mid: 3.2, minor: 2.2 };
    var TICK_W = { major: 0.55, mid: 0.4, minor: 0.25 };

    var scales = FC.scales = {};

    // Tick list for the 10..100 logarithmic scale.
    scales.logTicks = function () {
        var list = [];
        function add(start, end, step) {
            for (var i = 0; ; i++) {
                var v = Math.round((start + i * step) * 100) / 100;
                if (v >= end - 1e-9) { break; }
                list.push(v);
            }
        }
        add(10, 20, 0.2);
        add(20, 40, 0.5);
        add(40, 100, 1);
        return list.map(function (v) {
            var whole = v % 1 === 0;
            var labelled = whole && ((v < 30) || (v < 60 && v % 5 === 0) || (v >= 60 && v % 10 === 0));
            var kind = labelled ? 'major' : ((whole && v < 40) || v % 5 === 0 ? 'mid' : 'minor');
            return { v: v, angle: FC.core.valueToAngle(v), kind: kind, label: labelled ? String(v) : null };
        });
    };

    // Draw the log scale on a circle. dir=+1 puts the ticks outside radius R, -1 inside.
    // opts: { font, color, special }  special maps a value to a highlight colour, e.g. {60: '#c00'}
    scales.drawLog = function (parent, R, dir, opts) {
        opts = opts || {};
        var special = opts.special || {};
        var ticks = scales.logTicks();
        var color = opts.color || '#222';
        var d = { major: '', mid: '', minor: '' };
        function seg(a, b) {
            return 'M' + a.x.toFixed(2) + ' ' + a.y.toFixed(2) + 'L' + b.x.toFixed(2) + ' ' + b.y.toFixed(2);
        }
        ticks.forEach(function (t) {
            if (special[t.v]) { return; }
            d[t.kind] += seg(svg.pt(R, t.angle), svg.pt(R + dir * TICK_LEN[t.kind], t.angle));
        });
        ['minor', 'mid', 'major'].forEach(function (k) {
            svg.el(parent, 'path', { d: d[k], stroke: color, 'stroke-width': TICK_W[k], fill: 'none' });
        });
        var labelR = R + dir * (TICK_LEN.major + 3.4);
        ticks.forEach(function (t) {
            var hi = special[t.v];
            if (hi) {
                svg.el(parent, 'path', {
                    d: seg(svg.pt(R, t.angle), svg.pt(R + dir * TICK_LEN.major * 1.5, t.angle)),
                    stroke: hi, 'stroke-width': 1, fill: 'none'
                });
            }
            if (!t.label) { return; }
            svg.el(parent, 'text', {
                transform: 'rotate(' + t.angle.toFixed(2) + ') translate(0,' + (-labelR).toFixed(2) + ')',
                'text-anchor': 'middle', dy: '0.35em', 'font-size': opts.font || 3.8,
                fill: hi || color, 'font-weight': hi ? 'bold' : 'normal', 'font-family': 'Roboto, Arial, sans-serif'
            }, t.label);
        });
        return ticks;
    };
})(typeof window !== 'undefined' ? window : this);
