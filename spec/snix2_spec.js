describe("Snix", function(){

  describe("value", function(){

    it("returns a function", function(){
      expect(typeof(Snix.val())).toBe("function");
    });

    it("serializes the underlying as json", function(){

      expect(JSON.stringify(Snix.val(100))).toBe("100");
      expect(JSON.stringify(Snix.val("joe"))).toBe('"joe"');

      expect(JSON.stringify(Snix.val({name: "joe"}))).toBe('{"name":"joe"}');

      var obj = {name: "joe"};
      obj.toJSON = function(){
        return {"NAME": this.name};
      };

      expect(JSON.stringify(Snix.val(obj))).toBe('{"NAME":"joe"}');
    });

    describe("reading underlying value", function(){
      it("returns value when called without any argument", function(){
        expect(Snix.val()()).toBeNull();
        expect(Snix.val(100)()).toBe(100);
      });
    });

    describe("update underlying value", function(){

      it("uses the first argument as new value", function(){
        var v = Snix.val();
        expect(v(100)()).toBe(100);
      });

      it("returns self", function(){
        var v = Snix.val();
        expect(v(100)).toBe(v);
      });

      it("passes the new value through convert", function(){
        var v = Snix.val();

        spyOn(v, "convert").andCallThrough();
        v(100);

        expect(v.convert).toHaveBeenCalledWith(100);
      });
    });

    describe("events", function(){

      it("invokes change-listener when the underlying value changes", function(){
        var listener = jasmine.createSpy("change listener");
        var v = Snix.val().on("change", listener);

        // should fire because initial value is NULL and 100 is different
        v(100);
        expect(listener).toHaveBeenCalledWith(100, null);

        listener.reset();

        // should only call listener if newValue != oldValue 
        v(100);
        expect(listener).not.toHaveBeenCalled();

        // should call listener because newValue != oldValue 
        v(200);
        expect(listener).toHaveBeenCalledWith(200, 100);
      });

      it("invokes read-listener before returning the underlying value", function(){
        var listener = jasmine.createSpy("read listener");
        var v = Snix.val().on("read", listener);

        v();
        expect(listener).toHaveBeenCalledWith(null);

        listener.reset();

        v(100);
        v();
        expect(listener).toHaveBeenCalledWith(100);
      });

    });


  });

  describe("utils", function(){

    it("returns the underlying value", function(){
      expect(Snix.unwrap(null)).toBeNull();
      expect(Snix.unwrap("joe")).toBe("joe");

      expect(Snix.unwrap(Snix.val())).toBe(null);
      expect(Snix.unwrap(Snix.val("joe"))).toBe("joe");
    });

    it("returns an id of the passed argument", function(){
      expect(function(){
        Snix.idOf(null)
      }).toThrow("illegal argument");

      expect(Snix.idOf(10)).toBe("10");
      expect(Snix.idOf(10.1)).toBe("10.1");
      expect(Snix.idOf("joe")).toBe("joe");
      expect(Snix.idOf({id: 100})).toBe("100");
    });

  });

  describe("types", function(){

    it("converts the passed value to an int", function(){
      expect(Snix.int(null)()).toBeNull();
      expect(Snix.int(100)()).toBe(100);
      expect(Snix.int()("100")()).toBe(100);
    });

    it("converts the passed value to a float", function(){
      expect(Snix.float(null)()).toBeNull();
      expect(Snix.float(100.1)()).toBe(100.1);
      expect(Snix.float()("100.1")()).toBe(100.1);
    });

    it("converts the passed value to a boolean", function(){
      expect(Snix.boolean(null)()).toBeNull();
      expect(Snix.boolean(true)()).toBeTruthy();
      expect(Snix.boolean(false)()).toBeFalsy();
      expect(Snix.boolean()("true")()).toBeTruthy();
      expect(Snix.boolean()("false")()).toBeFalsy();
      expect(Snix.boolean()("yes")()).toBeTruthy();
      expect(Snix.boolean()("no")()).toBeFalsy();
    });

  });

  describe("bindings", function(){

    beforeEach(function(){ $("#snix").empty(); });
    afterEach(function(){ $("#snix").empty(); });

    it("value", function(){
      var app = {name: Snix.val("joe")};

      var el = $("<input type='text' data-bind='value: @name'/>");
      $("#snix").append(el);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).val()).toBe("joe");

      el.val("bob").trigger("change");
      expect(app.name()).toBe("bob");
    });

    it("text", function(){
      var app = {name: Snix.val("joe")};

      var el = $("<span data-bind='text: @name'></span>");
      $("#snix").append(el);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).text()).toBe("joe");
    });

    it("html", function(){
      var app = {name: Snix.val("<b>joe</b>")};

      var el = $("<span data-bind='html: @name'></span>");
      $("#snix").append(el);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).html()).toBe("<b>joe</b>");
    });

    it("loop", function(){
      var entry1 = {id: 1, name: "entry1"};
      var entry2 = {id: 2, name: "entry2"};

      var app = {entries: Snix.array([
        entry1,
        entry2
      ])};

      var el = $("<ul data-bind=\"loop: {entries: @entries, as: 'entry'}\"><li><span data-bind='text: entry.name'></span></li></ul>");
      $("#snix").append(el);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).children().length).toBe(2);

      var child1 = $(el).children().toArray()[0];
      var child2 = $(el).children().toArray()[1];

      expect($(child1).attr("data-id")).toBe("1");
      expect($(child2).attr("data-id")).toBe("2");

      expect($("span", child1).text()).toBe("entry1");
      expect($("span", child2).text()).toBe("entry2");

      // remove an entry

      app.entries.remove(entry1);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).children().length).toBe(1);

      child1 = $(el).children().toArray()[0];
      expect($(child1).attr("data-id")).toBe("2");
      expect($("span", child1).text()).toBe("entry2");

      // add an entry

      app.entries.add(entry1);

      Snix.refresh(app, $("#snix")[0]);

      expect($(el).children().length).toBe(2);

      child1 = $(el).children().toArray()[0];
      child2 = $(el).children().toArray()[1];

      expect($(child1).attr("data-id")).toBe("2");
      expect($(child2).attr("data-id")).toBe("1");

      expect($("span", child1).text()).toBe("entry2");
      expect($("span", child2).text()).toBe("entry1");
    });

    it("date", function(){
      var app = {mom: Snix.moment(moment("20130101", "YYYYMMDD"))};

      var el = $("<div data-bind='date: {moment: @mom}'></div>");
      $("#snix").append(el);

      Snix.refresh(app, $("#snix")[0]);

      expect($("select.year", el).val()).toBe("2013");
      expect($("select.month", el).val()).toBe("1");
      expect($("select.day", el).val()).toBe("1");

      app.mom(null);

      Snix.refresh(app, $("#snix")[0]);

      expect($("select.year", el).val()).toBe("-1");
      expect($("select.month", el).val()).toBe("-1");
      expect($("select.day", el).val()).toBe("-1");
    });

  });

});