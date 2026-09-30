// AI-GEN-BEGIN
/** 北京天气（Open-Meteo 免费）+ 尾号限行 */
(function () {
  var WEATHER_EL = document.getElementById("bj-weather");
  var PLATE_EL = document.getElementById("bj-plate");
  if (!WEATHER_EL && !PLATE_EL) return;

  var WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  // 北京工作日尾号限行（按星期）：周末不限；法定节假日以交管发布为准
  var PLATE_BY_DOW = {
    1: [1, 6],
    2: [2, 7],
    3: [3, 8],
    4: [4, 9],
    5: [5, 0],
  };

  var WMO = {
    0: "晴",
    1: "晴间多云",
    2: "多云",
    3: "阴",
    45: "雾",
    48: "雾凇",
    51: "小毛毛雨",
    53: "毛毛雨",
    55: "大毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    66: "冻雨",
    67: "强冻雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    77: "雪粒",
    80: "阵雨",
    81: "强阵雨",
    82: "暴雨",
    85: "阵雪",
    86: "强阵雪",
    95: "雷阵雨",
    96: "雷阵雨伴冰雹",
    99: "强雷暴冰雹",
  };

  function weatherLabel(code) {
    return WMO[code] || "未知";
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function ymd(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function plateForDate(d) {
    var dow = d.getDay();
    if (dow === 0 || dow === 6) {
      return { limited: false, digits: [], text: "不限行" };
    }
    var digits = PLATE_BY_DOW[dow] || [];
    return {
      limited: true,
      digits: digits,
      text: "限行 " + digits.join(" 和 "),
    };
  }

  function renderPlate() {
    if (!PLATE_EL) return;
    var today = new Date();
    var rows = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      var info = plateForDate(d);
      var label =
        i === 0 ? "今天" : i === 1 ? "明天" : "周" + WEEKDAYS[d.getDay()];
      var digitsHtml = info.limited
        ? info.digits
            .map(function (n) {
              return '<span class="plate-digit">' + n + "</span>";
            })
            .join("")
        : '<span class="plate-free">不限</span>';
      rows.push(
        '<div class="city-row' +
          (i === 0 ? " is-today" : "") +
          '">' +
          '<div class="city-row-meta"><strong>' +
          label +
          "</strong><span>" +
          pad(d.getMonth() + 1) +
          "-" +
          pad(d.getDate()) +
          " · 周" +
          WEEKDAYS[d.getDay()] +
          "</span></div>" +
          '<div class="plate-digits">' +
          digitsHtml +
          "</div></div>"
      );
    }
    var t = plateForDate(today);
    PLATE_EL.innerHTML =
      '<div class="city-panel-head"><h3>北京尾号限行</h3><p class="muted">五环内 · 工作日</p></div>' +
      '<div class="plate-today">' +
      (t.limited
        ? '<p class="plate-today-label">今日限行尾号</p><div class="plate-digits plate-digits--lg">' +
          t.digits
            .map(function (n) {
              return '<span class="plate-digit">' + n + "</span>";
            })
            .join('<span class="plate-and">与</span>') +
          "</div>"
        : '<p class="plate-today-label">今日</p><p class="plate-free-lg">不限行</p>') +
      "</div>" +
      '<div class="city-list">' +
      rows.join("") +
      "</div>" +
      '<p class="city-note muted">规则按星期轮换；节假日以交管发布为准。</p>';
  }

  function renderWeatherLoading() {
    if (!WEATHER_EL) return;
    WEATHER_EL.innerHTML =
      '<div class="city-panel-head"><h3>北京天气</h3><p class="muted">加载中…</p></div>';
  }

  function renderWeatherError(msg) {
    if (!WEATHER_EL) return;
    WEATHER_EL.innerHTML =
      '<div class="city-panel-head"><h3>北京天气</h3></div><p class="muted">' +
      (msg || "暂时无法获取") +
      "</p>";
  }

  function renderWeather(data) {
    if (!WEATHER_EL || !data || !data.daily) return;
    var daily = data.daily;
    var current = data.current || {};
    var days = [];
    var n = Math.min(8, (daily.time || []).length);
    for (var i = 0; i < n; i++) {
      var dateStr = daily.time[i];
      var parts = dateStr.split("-");
      var d = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
      );
      var label =
        i === 0 ? "今天" : i === 1 ? "明天" : "周" + WEEKDAYS[d.getDay()];
      var code = daily.weather_code[i];
      var tmax = Math.round(daily.temperature_2m_max[i]);
      var tmin = Math.round(daily.temperature_2m_min[i]);
      days.push(
        '<div class="city-row' +
          (i === 0 ? " is-today" : "") +
          '">' +
          '<div class="city-row-meta"><strong>' +
          label +
          "</strong><span>" +
          weatherLabel(code) +
          "</span></div>" +
          '<div class="weather-temps"><span class="tmax">' +
          tmax +
          '°</span><span class="tmin">' +
          tmin +
          "°</span></div></div>"
      );
    }

    var nowTemp =
      current.temperature_2m != null
        ? Math.round(current.temperature_2m) + "°"
        : "—";
    var nowLabel = weatherLabel(current.weather_code);
    WEATHER_EL.innerHTML =
      '<div class="city-panel-head"><h3>北京天气</h3><p class="muted">Open-Meteo</p></div>' +
      '<div class="weather-now">' +
      '<div class="weather-now-temp">' +
      nowTemp +
      "</div>" +
      '<div class="weather-now-meta"><strong>' +
      nowLabel +
      "</strong><span>今天 · 未来 7 天</span></div></div>" +
      '<div class="city-list">' +
      days.join("") +
      "</div>" +
      '<p class="city-note muted">数据来源 Open-Meteo · CC BY</p>';
  }

  function loadWeather() {
    renderWeatherLoading();
    var url =
      "https://api.open-meteo.com/v1/forecast" +
      "?latitude=39.9042&longitude=116.4074" +
      "&current=temperature_2m,weather_code" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
      "&timezone=Asia%2FShanghai&forecast_days=8";
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("http " + r.status);
        return r.json();
      })
      .then(renderWeather)
      .catch(function () {
        renderWeatherError("天气加载失败，请稍后刷新");
      });
  }

  renderPlate();
  loadWeather();
})();
// AI-GEN-END
