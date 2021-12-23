'use strict';

/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

const Gio = imports.gi.Gio;
const Lang = imports.lang;

const DBusIface = '<node>\
    <interface name="com.github.clueliss.WindowCtl">\
        <method name="GetNumMonitors">\
            <arg type="u" direction="out" name="numMonitors"/>\
        </method>\
        <method name="ListWindows">\
            <arg type="a((iiiib)iuss)" direction="out" name="result"/>\
        </method>\
        <method name="SetWindowGeomByClass">\
            <arg type="s" direction="in" name="windowClass" />\
            <arg type="(iiiib)" direction="in" name="windowGeometry"/>\
            <arg type="b" direction="out" name="success"/>\
        </method>\
    </interface>\
</node>';


const DBusClass = new Lang.Class({
    Name: "WindowCtl",

    _init: function () {
        this._dbusImpl = Gio.DBusExportedObject.wrapJSObject(DBusIface, this);
        this._dbusImpl.export(Gio.DBus.session, "/com/github/clueliss/WindowCtl");
    },

    disconnect: function () {
        this._dbusImpl.unexport();
    },

    GetNumMonitors: function () {
        return global.get_display().get_n_monitors();
    },

    ListWindows: function () {
        return global
            .get_window_actors()
            .map(a => a.meta_window.find_root_ancestor())
            .map(w => {
                let rect = w.get_frame_rect();

                return [
                    [
                        rect.x,
                        rect.y,
                        rect.width,
                        rect.height,
                        w.minimized
                    ],
                    w.get_pid(),
                    w.get_stable_sequence(),
                    w.get_wm_class() || "",
                    w.get_gtk_application_id() || ""
                ];
            });
    },

    SetWindowGeomByClass: function (windowClass, windowGeometry) {
        let w = global
            .get_window_actors()
            .map(a => a.meta_window)
            .filter(w => w.wm_class == windowClass)
            .reduce((acc, x) => (acc && acc.id > x.id) ? acc : x, null);
        
        if (w == null) {
            return false;
        } else {
            if (windowGeometry[4]) {
                w.minimize();
            }
        
            // TODO FIX: cannot move window while it is fullscreened
            w.move_resize_frame(false, windowGeometry[0], windowGeometry[1], windowGeometry[2], windowGeometry[3]);

            return true;
        }
    }
});

class Extension {
    constructor() {
    }

    enable() {
        this._dbusInst = new DBusClass();
    }

    disable() {
        this._dbusInst.disconnect();
        this._dbusInst = null;
    }
}

function init() {
    return new Extension();
}
