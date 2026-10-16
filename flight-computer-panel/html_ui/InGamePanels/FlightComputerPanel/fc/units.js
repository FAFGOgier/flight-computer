// Unit conversions. Each category stores a factor to its base unit (value_in_base = value * factor).
(function (g) {
    'use strict';
    var FC = g.FC = g.FC || {};

    var categories = {
        distance: { label: 'Distance', units: [
            { id: 'nm', label: 'NM', factor: 1 },
            { id: 'sm', label: 'SM', factor: 0.868976 },
            { id: 'km', label: 'km', factor: 0.539957 }
        ] },
        speed: { label: 'Speed', units: [
            { id: 'kt', label: 'kt', factor: 1 },
            { id: 'mph', label: 'mph', factor: 0.868976 },
            { id: 'kmh', label: 'km/h', factor: 0.539957 }
        ] },
        mass: { label: 'Mass', units: [
            { id: 'kg', label: 'kg', factor: 1 },
            { id: 'lb', label: 'lb', factor: 0.45359237 }
        ] },
        volume: { label: 'Volume', units: [
            { id: 'l', label: 'L', factor: 1 },
            { id: 'usg', label: 'US gal', factor: 3.785411784 },
            { id: 'impg', label: 'Imp gal', factor: 4.54609 }
        ] },
        height: { label: 'Height', units: [
            { id: 'ft', label: 'ft', factor: 1 },
            { id: 'm', label: 'm', factor: 3.280839895 }
        ] },
        pressure: { label: 'Pressure', units: [
            { id: 'hpa', label: 'hPa', factor: 1 },
            { id: 'inhg', label: 'inHg', factor: 33.8638866667 }
        ] }
    };

    function find(cat, id) {
        var list = categories[cat].units;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) { return list[i]; }
        }
        return null;
    }

    FC.units = {
        categories: categories,
        // How many `to` units one `from` unit makes.
        ratio: function (cat, from, to) {
            return find(cat, from).factor / find(cat, to).factor;
        },
        convert: function (cat, from, to, value) {
            return value * FC.units.ratio(cat, from, to);
        },
        cToF: function (c) { return c * 9 / 5 + 32; },
        fToC: function (f) { return (f - 32) * 5 / 9; }
    };
})(typeof window !== 'undefined' ? window : this);
