

Module.register("gcalendar",{

    defaults: {
        text: "Google Calendar"
    },

    start:function () {
        this.sendSocketNotification("WEATHER", "hello");
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.innerHTML = this.config.text;
        return wrapper;
    },

    socketNotificationReceived: function (type, data) {
        this.config.text = data;
        this.updateDom();
    },

    getStyles: function() {
        return ["gcalendar.css"];
    },

});
