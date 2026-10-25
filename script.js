/* ============================================================
   KONFIG
============================================================ */

const LAT = 58.767454;
const LON = 16.982295;

/* ============================================================
   DEBUG
============================================================ */
document.getElementById("debug_toggle").onclick = () => {
    const panel = document.getElementById("debug_panel");
    const toggle = document.getElementById("debug_toggle");
    const open = panel.style.display === "block";
    panel.style.display = open ? "none" : "block";
    toggle.textContent = open ? "Debug ▾" : "Debug ▴";
};

function debug(msg, obj = null) {
    const box = document.getElementById("debug_box");
    const time = new Date().toLocaleTimeString("sv-SE");
    box.innerHTML += `<div><b>[${time}]</b> ${msg}</div>`;
    if (obj) box.innerHTML += `<pre>${JSON.stringify(obj, null, 2)}</pre>`;
    box.scrollTop = box.scrollHeight;
}

/* ============================================================
   HJÄLPFUNKTIONER
============================================================ */
function safe(obj, path) {
    return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

function trendArrow(v) {
    if (v > 0) return "↑";
    if (v < 0) return "↓";
    return "→";
}
function trendClass(v) {
    if (v > 0) return "trend-up";
    if (v < 0) return "trend-down";
    return "trend-flat";
}

function setBadge(el, cls) {
    el.className = "badge " + cls;
}
function classifyWind(speed) {
    if (speed < 2) return "wind-calm";
    if (speed < 6) return "wind-breezy";
    if (speed < 12) return "wind-windy";
    return "wind-storm";
}
function classifyTemp(t) {
    if (t < 0) return "temp-cold";
    if (t < 10) return "temp-cool";
    if (t < 20) return "temp-warm";
    return "temp-hot";
}
function classifyUvi(u) {
    if (u < 3) return "uvi-low";
    if (u < 6) return "uvi-mod";
    if (u < 8) return "uvi-high";
    if (u < 11) return "uvi-very";
    return "uvi-extreme";
}

/* ============================================================
   MAX/MIN – DAGLIG
============================================================ */
function today() {
    return new Date().toISOString().split("T")[0];
}
function loadExtremes() {
    const saved = localStorage.getItem("extremes_v2");
    if (!saved) return { date: today(), values: {} };
    const parsed = JSON.parse(saved);
    if (parsed.date !== today()) return { date: today(), values: {} };
    return parsed;
}
let extremes = loadExtremes();
function saveExtremes() {
    localStorage.setItem("extremes_v2", JSON.stringify(extremes));
}
function updateExtreme(key, value) {
    if (value === null || value === undefined) return;
    const num = Number(value);
    if (isNaN(num)) return;
    if (!extremes.values[key]) {
        extremes.values[key] = { max: num, min: num };
    } else {
        extremes.values[key].max = Math.max(extremes.values[key].max, num);
        extremes.values[key].min = Math.min(extremes.values[key].min, num);
    }
}
function getExtreme(key, type, ecowittValue) {
    if (ecowittValue !== null && ecowittValue !== undefined) return ecowittValue;
    if (extremes.values[key]) return extremes.values[key][type];
    return "–";
}

/* ============================================================
   MÅNFAS
============================================================ */
function getMoonPhase() {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();

    let YY = year - Math.floor((12 - month) / 10);
    let MM = month + 9;
    if (MM >= 12) MM -= 12;

    const K1 = Math.floor(365.25 * (YY + 4712));
    const K2 = Math.floor(30.6 * MM + 0.5);
    const K3 = Math.floor(Math.floor((YY / 100) + 49) * 0.75) - 38;

    const JD = K1 + K2 + day + 59;
    const IP = (JD - 2451550.1) / 29.530588853;
    return IP - Math.floor(IP);
}
function getPhaseName(p) {
    if (p < 0.03 || p > 0.97) return "Nymåne";
    if (p < 0.22) return "Tilltagande skära";
    if (p < 0.28) return "Första kvarteret";
    if (p < 0.47) return "Tilltagande måne";
    if (p < 0.53) return "Fullmåne";
    if (p < 0.72) return "Avtagande måne";
    if (p < 0.78) return "Sista kvarteret";
    return "Avtagande skära";
}
function drawMoonSVG(phase) {
    const percent = Math.abs(phase - 0.5) * 2;
    const illuminated = 1 - percent;
    const svg = `
    <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#f5f3ce"/>
        <path d="
            M 50 5
            A 45 45 0 0 0 50 95
            A ${45 * illuminated} 45 0 0 1 50 5
        " fill="#020617"/>
    </svg>`;
    document.getElementById("moon_svg").innerHTML = svg;
}
function updateLocalMoonPhase() {
    const p = getMoonPhase();
    drawMoonSVG(p);
    document.getElementById("moon_text").textContent = getPhaseName(p);
}

/* ============================================================
   SOLTIDER – SUNCALC
============================================================ */
function calcSunTimes(lat, lon) {
    const rad = Math.PI / 180;

    function toJulian(date) {
        return date.getTime() / 86400000 - 0.5 + 2440587.5;
    }

    function fromJulian(j) {
        return new Date((j + 0.5 - 2440587.5) * 86400000);
    }

    function solarMeanAnomaly(d) {
        return rad * (357.5291 + 0.98560028 * d);
    }

    function eclipticLongitude(M) {
        const C = rad * (1.9148 * Math.sin(M) + 0.0200 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
        const P = rad * 102.9372;
        return M + C + P + Math.PI;
    }

    function sunDeclination(L) {
        const e = rad * 23.4397;
        return Math.asin(Math.sin(L) * Math.sin(e));
    }

    function hourAngle(h, phi, dec) {
        return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
    }

    const date = new Date();
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    const lw = -lon * rad;
    const phi = lat * rad;
    const d = toJulian(utcDate) - 2451545;

    const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
    const ds = n + 0.0009 + lw / (2 * Math.PI);

    const M = solarMeanAnomaly(ds);
    const L = eclipticLongitude(M);
    const dec = sunDeclination(L);

    const Jtransit = 2451545 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const h0 = -0.833 * rad;

    const cosH = (Math.sin(h0) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));

    if (cosH < -1 || cosH > 1) {
        return { sunrise: "--:--", sunset: "--:--" };
    }

    const H = hourAngle(h0, phi, dec);
    const Jrise = Jtransit - H / (2 * Math.PI);
    const Jset = Jtransit + H / (2 * Math.PI);

    const sunrise = fromJulian(Jrise).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Stockholm"
    });

    const sunset = fromJulian(Jset).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Stockholm"
    });

    return { sunrise, sunset };
}

/* ============================================================
   HÄMTA DATA
============================================================ */
async function loadWeather() {
    const errorEl = document.getElementById("error");
    errorEl.textContent = "";

    if (extremes.date !== today()) {
        extremes = { date: today(), values: {} };
    }

    try {
        const response = await fetch(`weather.json?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("weather.json saknas (HTTP " + response.status + ")");
        const d = await response.json();
        debug("Data hämtad från weather.json");

        /* VIND */
        const ws = safe(d, "wind.wind_speed.value");
        const wg = safe(d, "wind.wind_gust.value");
        const wd = safe(d, "wind.wind_direction.value");

        wind_speed.textContent = ws ?? "–";
        wind_gust.textContent  = wg ?? "–";
        wind_dir.textContent   = wd ?? "–";

        setBadge(wind_badge, classifyWind(Number(ws ?? 0)));
        compass_arrow.style.transform = `translateX(-50%) rotate(${Number(wd ?? 0)}deg)`;

        updateExtreme("wind", ws);
        updateExtreme("gust", wg);
        wind_max.textContent = getExtreme("wind", "max", safe(d, "wind.wind_speed.max.value"));
        gust_max.textContent = getExtreme("gust", "max", safe(d, "wind.wind_gust.max.value"));

        /* REGN */
        const rr = safe(d, "rainfall.rain_rate.value");
        rain_rate.textContent = rr ?? "–";
        rain_daily.textContent  = safe(d, "rainfall.daily.value") ?? "–";
        rain_event.textContent  = safe(d, "rainfall.event.value") ?? "–";
        rain_hourly.textContent = safe(d, "rainfall.hourly.value") ?? "–";
        rain_weekly.textContent = safe(d, "rainfall.weekly.value") ?? "–";
        rain_monthly.textContent= safe(d, "rainfall.monthly.value") ?? "–";
        rain_yearly.textContent = safe(d, "rainfall.yearly.value") ?? "–";

        updateExtreme("rain_rate", rr);
        rain_rate_max.textContent = getExtreme("rain_rate", "max", null);
        rain_rate_min.textContent = getExtreme("rain_rate", "min", null);

        /* TRYCK */
        const pr = safe(d, "pressure.relative.value");
        const pa = safe(d, "pressure.absolute.value");
        const ptrend = safe(d, "pressure.relative.trend");

        pressure_rel.textContent = pr ?? "–";
        pressure_abs.textContent = pa ?? "–";
        pressure_trend.textContent = trendArrow(ptrend);
        pressure_trend.className = "trend " + trendClass(ptrend);

        updateExtreme("pressure", pr);
        pressure_max.textContent = getExtreme("pressure", "max", safe(d, "pressure.relative.max.value"));
        pressure_min.textContent = getExtreme("pressure", "min", safe(d, "pressure.relative.min.value"));

        /* UTOMHUS */
        const to = safe(d, "outdoor.temperature.value");
        const ho = safe(d, "outdoor.humidity.value");
        const doo = safe(d, "outdoor.dew_point.value");

        temp_out.textContent = to ?? "–";
        hum_out.textContent  = ho ?? "–";
        dew_out.textContent  = doo ?? "–";

        setBadge(temp_badge, classifyTemp(Number(to ?? 0)));

        updateExtreme("temp_out", to);
        updateExtreme("hum_out", ho);
        updateExtreme("dew_out", doo);

        temp_out_max.textContent = getExtreme("temp_out", "max", safe(d, "outdoor.temperature.max.value"));
        temp_out_min.textContent = getExtreme("temp_out", "min", safe(d, "outdoor.temperature.min.value"));
        hum_out_max.textContent  = getExtreme("hum_out", "max", safe(d, "outdoor.humidity.max.value"));
        hum_out_min.textContent  = getExtreme("hum_out", "min", safe(d, "outdoor.humidity.min.value"));
        dew_out_max.textContent  = getExtreme("dew_out", "max", null);
        dew_out_min.textContent  = getExtreme("dew_out", "min", null);

        /* INOMHUS */
        const ti = safe(d, "indoor.temperature.value");
        const hi = safe(d, "indoor.humidity.value");
        const di = safe(d, "indoor.dew_point.value");

        temp_in.textContent = ti ?? "–";
        hum_in.textContent  = hi ?? "–";
        dew_in.textContent  = di ?? "–";

        updateExtreme("temp_in", ti);
        updateExtreme("hum_in", hi);
        updateExtreme("dew_in", di);

        temp_in_max.textContent = getExtreme("temp_in", "max", safe(d, "indoor.temperature.max.value"));
        temp_in_min.textContent = getExtreme("temp_in", "min", safe(d, "indoor.temperature.min.value"));
        hum_in_max.textContent  = getExtreme("hum_in", "max", null);
        hum_in_min.textContent  = getExtreme("hum_in", "min", null);
        dew_in_max.textContent  = getExtreme("dew_in", "max", null);
        dew_in_min.textContent  = getExtreme("dew_in", "min", null);

        /* SOL & UV */
        const sol = safe(d, "solar_and_uvi.solar.value");
        const uv  = safe(d, "solar_and_uvi.uvi.value");

        solar.textContent = sol ?? "–";
        uvi.textContent   = uv ?? "–";

        setBadge(uvi_badge, classifyUvi(Number(uv ?? 0)));

        updateExtreme("solar", sol);
        updateExtreme("uvi", uv);

        solar_max.textContent = getExtreme("solar", "max", safe(d, "solar_and_uvi.solar.max.value"));
        solar_min.textContent = getExtreme("solar", "min", null);
        uvi_max.textContent   = getExtreme("uvi", "max", safe(d, "solar_and_uvi.uvi.max.value"));
        uvi_min.textContent   = getExtreme("uvi", "min", null);

        /* MÅNFAS */
        const moonAPI = safe(d, "moon.phase_name");
        if (moonAPI) {
            moon_text.textContent = moonAPI;
            updateLocalMoonPhase();
        } else {
            updateLocalMoonPhase();
        }

        /* SOLTIDER */
        const tSun = calcSunTimes(LAT, LON);
        if (typeof sunrise !== 'undefined') sunrise.textContent = tSun.sunrise;
        if (typeof sunset !== 'undefined') sunset.textContent   = tSun.sunset;

        /* TIDSTÄMPEL */
        last_update.textContent = "Senast uppdaterad: " + new Date().toLocaleString("sv-SE");

        /* SPARA EXTREMER */
        saveExtremes();

        debug("Uppdatering klar.");
    } catch (err) {
        errorEl.textContent = "Fel: " + err.message;
        debug("FEL: " + err.message);
    }
}

/* ============================================================
   VÄRMEPUMP
============================================================ */
async function loadPannan() {
    try {
        const r = await fetch(`pannan.json?t=${Date.now()}`, { cache: "no-store" });
        const p = await r.json();
        document.getElementById("pannan_värden").innerHTML =
            Object.entries(p.värden).map(([namn, v]) => `
                <div class="col">
                    <span class="label">${namn}</span>
                    <div>
                        <span class="value-main">${v.värde}</span>
                        <span class="value-unit">${v.enhet ?? ""}</span>
                    </div>
                </div>`).join("");
        document.getElementById("pannan_tid").textContent =
            "Uppdaterad " + new Date(p.uppdaterad).toLocaleString("sv-SE");
    } catch (e) {
        document.getElementById("pannan_värden").textContent = "Kunde inte läsa pannan.json";
    }
}
loadPannan();
setInterval(loadPannan, 60000);

loadWeather();
setInterval(loadWeather, 30000);
/* ============================================================
   ENERGI
============================================================ */
async function loadEnergi() {
    try {
        const r = await fetch(`energi.json?t=${Date.now()}`, { cache: "no-store" });
        const e = await r.json();
        const fmt = (v, dec = 1) => (v === null || v === undefined) ? "–" : Number(v).toFixed(dec);
        const rader = [
            ["Just nu", fmt(e.effekt_w / 1000, 2), "kW"],
            ["Senaste timmen", fmt(e.senaste_timmen_kwh, 2), "kWh"],
            ["Idag", fmt(e.idag_kwh, 2), "kWh"],
            ["Kostnad idag", fmt(e.idag_kostnad_kr, 2), "kr"],
            ["Totalt", fmt(e.totalt_kwh, 0), "kWh"],
        ];
        document.getElementById("energi_värden").innerHTML = rader.map(([namn, v, enhet]) => `
            <div class="col">
                <span class="label">${namn}</span>
                <div>
                    <span class="value-main">${v}</span>
                    <span class="value-unit">${enhet}</span>
                </div>
            </div>`).join("");
        document.getElementById("energi_tid").textContent =
            "Uppdaterad " + new Date(e.uppdaterad).toLocaleString("sv-SE");
    } catch (err) {
        document.getElementById("energi_värden").textContent = "Kunde inte läsa energi.json";
    }
}
loadEnergi();
setInterval(loadEnergi, 60000);
