
var STZC = {};

(function() {
  "use strict";

  var RIGHT_DEFAULT_CONTEXT = "";
  var TIMEFORMAT_24H = 'HH:mm';
  var TIMEFORMAT_12H = 'h:mm tt';
  var nextyear = new Date( );
  nextyear.setFullYear(nextyear.getFullYear( ) + 1);
  var tz_delta_map = {}; // mapping of context strings ("Chicago", "GMT+3") to offset in seconds
  var allTZ = [];
  var selectedTZ1 = "GMT      (UTC)";
  var selectedTZ2 = "GMT      (UTC)";
  var latestTZ = ['GMT      (UTC)']; // list of latest used timezones
  var latestTZMax = 10;
  var tzList1 = []; // list of timezones for first select
  var tzList2 = []; // list of timezones for the second select
  var timeformat = 't';

  STZC.update = updateTimes;
  STZC.swap24h = swap24h;
  STZC.swapTimes = swapTimes;
  STZC.now = setNow;
  STZC.validTimeParse = validTimeParse;
  STZC.init = function() {
    initTZDeltaMap();
    createTZArrays();
    populateSelects(tzList1, tzList2);
    initTimeFormat();

    setFieldDefaults();

  };

  function setFieldDefaults() {
    var current_time = Date.parse('<!--#echo var="DATE_GMT" -->') || new Date();

    // retrieve time from local storage
    if(localStorage.time) {
      $('#time1-value').val(localStorage.time);
    } else {
      $('#time1-value').val(current_time.toString(timeformat));
    }
    // convert the value to populate the second time
    convert();
  }

  function convertBase(s, from_tz_value, to_tz_value) {
    var utcDate = toUTC(validTimeParse(s), tz_delta_map[from_tz_value]);
    var toDate = fromUTC(utcDate, tz_delta_map[to_tz_value]);
    return toDate;
  }


  function convert() {
    var from      = document.getElementById('time1-value');
    var to        = document.getElementById('time2-value');
    var from_tz   = document.getElementById('c1');
    var to_tz     = document.getElementById('c2');
    var info   = document.getElementById('timei');
    var from_offset = tz_delta_map[from_tz.value];
    var to_offset = tz_delta_map[to_tz.value];

    var convertedDateString = '';
    var fromDate = validTimeParse(from.value);
    if ( (fromDate !== null) &&
         (from_offset !== null) &&
         (to_offset !== null) )
    {
      var toDate = convertBase(from.value, from_tz.value, to_tz.value);
      if( (fromDate.getDay() === 0) && (toDate.getDay() === 6) ) {
          info.innerHTML = 'previous day';
      } else if((fromDate.getDay() === 6) && (toDate.getDay() === 0)) {
          info.innerHTML = 'next day';
      } else if(toDate.getDay() < fromDate.getDay()) {
          info.innerHTML = 'previous day';
      } else if(toDate.getDay() > fromDate.getDay()) {
          info.innerHTML = 'next day';
      } else {
          info.innerHTML = '';
      }
      convertedDateString = toDate.toString(timeformat);
      from.value = fromDate.toString(timeformat);
      to.innerHTML = convertedDateString;
    }
    else {
      info.innerHTML = '';
    }
  }

  // Context is the timezone list from which we selected a timezone. Undefined if we
  // arrived here from elsewhere.
  function updateTimes(context) {
    localStorage.time = $('#time1-value').val();

    convert(); //convert the times


    //Did we arrive here from a timezone change?
    if (typeof context !== 'undefined') {

      var chosenValue = $('#'+context+' :selected').val();

      if (context === "c1") {
        if (chosenValue === selectedTZ1) { return; }

        if (chosenValue === selectedTZ2) {
          latestTZ.removeAll(chosenValue);
        } else {
          if (latestTZ.contains(chosenValue)) {
            latestTZ.removeAll(chosenValue);
          } else if (latestTZ.length >= latestTZMax) {
            latestTZ.pop();
          }
        }
        latestTZ.unshift(chosenValue);
        selectedTZ1 = chosenValue;
        localStorage.selectedTZ1 = chosenValue;
        if (selectedTZ1 !== selectedTZ2 &&
                  latestTZ.length > 2 &&
                  latestTZ[1] != selectedTZ2) {
            var buf = latestTZ.splice(1,1)[0];
            latestTZ.splice(2,0,buf);
        }
      } else if (context === "c2") {
        if (chosenValue === selectedTZ2) { return; }

        if (chosenValue === selectedTZ1) {
          latestTZ.removeAll(chosenValue);
        } else {
          if (latestTZ.contains(chosenValue)) {
            latestTZ.removeAll(chosenValue);
          } else if (latestTZ.length >= latestTZMax) {
            latestTZ.pop();
          }
        }
        latestTZ.unshift(chosenValue);
        selectedTZ2 = chosenValue;
        localStorage.selectedTZ2 = chosenValue;
        if (selectedTZ1 !== selectedTZ2 &&
                  latestTZ.length > 2 &&
                  latestTZ[1] != selectedTZ1) {
            var buf = latestTZ.splice(1,1)[0];
            latestTZ.splice(2,0,buf);
        }
      }

      tzList1 = [selectedTZ1].concat(latestTZ).distinct().concat(allTZ).distinct();
      tzList2 = [selectedTZ2].concat(latestTZ).distinct().concat(allTZ).distinct();

      populateSelects(tzList1, tzList2);
      localStorage.latestTZ = JSON.stringify(latestTZ);
    }
  }

  function swapTimes()
  {
      // move time2 to time1.
      var time2 = document.getElementById('time2-value').innerHTML;
      document.getElementById('time1-value').value = time2;

      // swap select lists
      var tzListBuf = tzList2.slice(0);
      tzList2 = tzList1;
      tzList1 = tzListBuf;
      var selBuf = selectedTZ2;
      selectedTZ2 = selectedTZ1;
      selectedTZ1 = selBuf;
      localStorage.selectedTZ1 = selectedTZ1;
      localStorage.selectedTZ2 = selectedTZ2;

      populateSelects(tzList1, tzList2);
      updateTimes();
  }

  function swap24h(elem) {
    var format = elem.value;
    if(format === '24h') {
      timeformat = TIMEFORMAT_24H;
      elem.value = '12h';
      localStorage.timeformat = '24h';
    } else {
      timeformat = TIMEFORMAT_12H;
      elem.value = '24h';
      localStorage.timeformat = '12h';
    }

    var from = document.getElementById('time1-value');
    var to   = document.getElementById('time2-value');
    var from_date = validTimeParse(from.value);
    var to_date   = validTimeParse(to.innerHTML);
    if(from_date) {
      from.value = from_date.toString(timeformat);
    }
    if(to_date) {
      to.innerHTML = to_date.toString(timeformat);
    }
  }

  function setNow() {
    var current_time = Date.parse('<!--#echo var="DATE_GMT" -->') || new Date();
    $('#time1-value').val(current_time.toString(timeformat));
    convert();
  }

  function createTZArrays() {
    // Get the latest used timezones from localStorage
    if (localStorage.latestTZ) {
      latestTZ = JSON.parse(localStorage.latestTZ);
    }
    if (localStorage.selectedTZ1) {
      selectedTZ1 = localStorage.selectedTZ1;
    }
    if (localStorage.selectedTZ2) {
      selectedTZ2 = localStorage.selectedTZ2;
    }

    // Create an array of the rest of the timezones
    for(var s in tz_delta_map)  {
        if (tz_delta_map.hasOwnProperty(s)) {
            allTZ.push(s);
        }
    }

    // combine them and add selected TZ to front.
      tzList1 = [selectedTZ1].concat(latestTZ).distinct().concat(allTZ).distinct();
      tzList2 = [selectedTZ2].concat(latestTZ).distinct().concat(allTZ).distinct();
  }

  function initTZDeltaMap() {
    for(var s in tz) {
        if (tz.hasOwnProperty(s)) {
            tz_delta_map[s] = tz[s];
        }
    }
  }

  function populateSelects(arr1, arr2) {
    // remove any elements in the select lists
    document.getElementById('c1').innerHTML = "";
    document.getElementById('c2').innerHTML = "";

    $.each([arr1,arr2], function(s) { // iterate over two select lists
        $.each(this, function(i) {    // iterate over all timezones in list
            // add separator after the latestTZ items
            if (i==latestTZ.length) {
              $('#c'+(s+1)).append($("<option />")
                           .attr('disabled','disabled')
                           .text("-------"));
            }
            // add option
            $('#c'+(s+1)).append($("<option />")
                         .val(this)
                         .text(this));
        });
    });
  }

  function initTimeFormat() {
    if(localStorage.timeformat) {
      timeformat = (localStorage.timeformat === '24h') ? TIMEFORMAT_24H : TIMEFORMAT_12H;
    } else {
      var accept_language = parseAcceptLanguage('<!--#echo var="HTTP_ACCEPT_LANGUAGE" -->');
      for(var i=0; i < accept_language.length; i++) {
        if(shortTimes[accept_language[i]]) {
          timeformat = shortTimes[accept_language[i]];
          localStorage.timeformat = timeformat;
          break;
        }
      }
    }

    // set the value of the button
    var elem = document.getElementById('swap24h');
    if(timeformat.contains('H')) {
      elem.value = '12h';
    } else {
      elem.value = '24h';
    }
  }

  // Utility functions
  // shamelessly stolen and modified from thetimeconverter.com
  function toUTC(date, tz_offset_seconds) {
    var d = new Date(date.getTime() - tz_offset_seconds * 1000);
    return d;
  }
  function fromUTC(date, tz_offset_seconds) {
    return new Date(date.getTime() + tz_offset_seconds * 1000);
  }

  function validTimeParse(s) {
    if(s === null || typeof s === 'undefined') {
        return null;
    }
    if(isNaN(Number(s.charAt(0)))) {
        return null;
    }

    // try inserting : at position 1 or 2
    var s1=null,s2=null,r0=null,r1=null,r2=null;
    r0 = Date.parse(s);
    if(s.length >= 3) {
      s1 = s.substr(0,1) + ':' + s.substr(1,s.length);
      s2 = s.substr(0,2) + ':' + s.substr(2,s.length);
      r1 = Date.parse(s1);
      r2 = Date.parse(s2);
    }

    if ( (s.icontains('A') || s.icontains('P')) && s.icontains(':')) {
      return r0;
    } else if ( (s.icontains('A') || s.icontains('P')) && !s.icontains(':')) {
      return r0 ? r0 : r1 ? r1 : r2;
    } else if (!s.icontains(':') && s.length >= 3) {
      return r1 ? r1 : r2 ? r2 : r0;
    } else {
      // otherwise try appending ":00" to force time conversion
      var d = Date.parse(s + ":00");
      return d;
    }
  }

  function parseAcceptLanguage(s) {
    if(s[0] === '<') {
        return ['en-us']; // the SSI was not replaced
    }
    //s = 'da-DK,en-us;q=0.5'; // s = 'en-US,en;q=0.8'; // s = 'en-us';
    var elems = s.split(',');
    var langRanges = [];
    for(var i=0; i < elems.length; i++) {
      var elem = elems[i].trim();
      var langRange = elem.split(';')[0];
      langRanges.push(langRange.toLowerCase());
    }
    return langRanges;
  }

  // Prototypes
  String.prototype.trim = function() {
      return this.replace(/^\s+|\s+$/g, ''); 
  };
  String.prototype.contains = function(char) {
      return this.indexOf(char) !== -1; 
  };
  String.prototype.icontains = function(char) {
      return this.toUpperCase().indexOf(char.toUpperCase()) !== -1;
  };

  Array.prototype.filter = function(fun /*, thisp */)
  {
    "use strict";
    if (this == null)
      throw new TypeError();
    var t = Object(this);
    var len = t.length >>> 0;
    if (typeof fun != "function")
      throw new TypeError();
    var res = [];
    var thisp = arguments[1];
    for (var i = 0; i < len; i++) {
      if (i in t) {
        var val = t[i]; // in case fun mutates this
        if (fun.call(thisp, val, i, t))
          res.push(val);
      }
    }
    return res;
  };
  Array.prototype.removeAll = function(obj) {
    if (this == null) {
      throw new TypeError();
    }
    var t = Object(this);
    return t.filter(function(elem,idx,arr) {
      return elem === obj;
    });
  };
  Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
  }
  Array.prototype.distinct = function() {
    var derivedArray = [];
    for (var i = 0; i < this.length; i += 1) {
        if (!derivedArray.contains(this[i])) {
            derivedArray.push(this[i])
        }
    }
    return derivedArray;
  };

})();


window.onload = function() {
  "use strict";
  STZC.init();
  $('#swap24h').click(function() { STZC.swap24h(this); });
  $('#swapTimes').click(function() { STZC.swapTimes(); });
  $('#now').click(function() { STZC.now(); });
  $('form').submit(function() { STZC.update(); });
  $('#c1').change(function() { STZC.update("c1"); });
  $('#c2').change(function() { STZC.update("c2"); });
};

