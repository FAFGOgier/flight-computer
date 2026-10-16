// Pure maths for the flight computer. No DOM access, so it can be tested in any browser page.
// Angles are in degrees. On the dials, angle 0 is at the top and angles grow clockwise.
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};
    var core = FC.core = {};

    var RAD = Math.PI / 180;
    var A0 = 661.4786; // speed of sound at ISA sea level, knots

    function log10(x) { return Math.log(x) / Math.LN10; }

    core.norm360 = function (a) {
        a = a % 360;
        return a < 0 ? a + 360 : a;
    };

    // Signed angle in (-180, 180].
    core.norm180 = function (a) {
        a = core.norm360(a);
        return a > 180 ? a - 360 : a;
    };

    // ---- Logarithmic scale: one decade (10 -> 100) covers the full circle ----

    // Angle of a value on the scale. Any positive value is folded into the first decade.
    core.valueToAngle = function (v) {
        return core.norm360(360 * log10(v / 10));
    };

    // Value in [10, 100) at an angle.
    core.angleToValue = function (a) {
        return 10 * Math.pow(10, core.norm360(a) / 360);
    };

    // Angle that multiplies a reading by r when the inner disc is turned by it.
    core.ratioToAngle = function (r) {
        return core.norm360(360 * log10(r));
    };

    core.angleToRatio = function (a) {
        return Math.pow(10, core.norm180(a) / 360);
    };

    // The dials only know a value up to a power of ten. Pick the one closest to `near`.
    core.nearestDecade = function (value, near) {
        if (!(near > 0)) { return value; }
        var k = Math.round(log10(near / value));
        return value * Math.pow(10, k);
    };

    // ---- Time ----

    // Minutes -> "H:MM". Rounds to the nearest minute.
    core.formatHM = function (minutes) {
        var total = Math.round(minutes);
        var h = Math.floor(total / 60);
        var m = total - h * 60;
        return h + ':' + (m < 10 ? '0' : '') + m;
    };

    core.timeMinutes = function (distance, speed) { return distance / speed * 60; };

    // ---- Wind triangle ----

    // course: true course to fly, windFrom: direction the wind blows from.
    // Returns null when the wind is too strong for the aircraft to hold the course.
    core.windTriangle = function (tas, course, windFrom, windSpeed) {
        if (!(tas > 0)) { return null; }
        var d = (windFrom - course) * RAD;
        var s = windSpeed * Math.sin(d) / tas;
        if (Math.abs(s) > 1) { return null; }
        var wca = Math.asin(s);
        return {
            wca: wca / RAD,
            heading: core.norm360(course + wca / RAD),
            gs: tas * Math.cos(wca) - windSpeed * Math.cos(d),
            headwind: windSpeed * Math.cos(d),
            crosswind: windSpeed * Math.sin(d)
        };
    };

    // Wind from heading/TAS and track/ground speed.
    core.windFromTrack = function (tas, heading, gs, track) {
        var h = heading * RAD, t = track * RAD;
        var we = gs * Math.sin(t) - tas * Math.sin(h);
        var wn = gs * Math.cos(t) - tas * Math.cos(h);
        return {
            from: core.norm360(Math.atan2(-we, -wn) / RAD),
            speed: Math.sqrt(we * we + wn * wn)
        };
    };

    // ---- Atmosphere (ISA, troposphere) ----

    core.isaTemp = function (pressureAlt) { return 15 - 1.98122 * pressureAlt / 1000; };

    core.pressureRatio = function (pressureAlt) {
        return Math.pow(1 - 6.8755856e-6 * pressureAlt, 5.255877);
    };

    // cas in knots, pressureAlt in feet, oat in deg C.
    core.airspeed = function (cas, pressureAlt, oat) {
        var tk = oat + 273.15;
        var delta = core.pressureRatio(pressureAlt);
        var qcP0 = Math.pow(1 + 0.2 * Math.pow(cas / A0, 2), 3.5) - 1;
        var mach = Math.sqrt(5 * (Math.pow(qcP0 / delta + 1, 2 / 7) - 1));
        var sound = A0 * Math.sqrt(tk / 288.15);
        var sigma = delta * 288.15 / tk;
        return {
            tas: mach * sound,
            mach: mach,
            densityAlt: 145442.16 * (1 - Math.pow(sigma, 0.234969)),
            isaDev: oat - core.isaTemp(pressureAlt)
        };
    };

    // Ratio TAS/CAS used to set the discs.
    core.tasRatio = function (pressureAlt, oat, refCas) {
        refCas = refCas || 150;
        return core.airspeed(refCas, pressureAlt, oat).tas / refCas;
    };
})(typeof window !== 'undefined' ? window : this);
