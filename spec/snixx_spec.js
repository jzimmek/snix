describe("Snix", function(){

  describe("shell", function(){

    it("is a function", function(){
      expect(typeof(Snix.shell())).toBe("function");
    });

    it("implements toJSON", function(){
      expect(typeof(Snix.shell().toJSON)).toBe("function");
    });

    it("implements set", function(){
      expect(typeof(Snix.shell().set)).toBe("function");
    });

    it("implements get", function(){
      expect(typeof(Snix.shell().get)).toBe("function");
    });

    it("is unwrappable", function(){
      expect(Snix.shell().__unwrap__).toBeTruthy();
    });

    it("implements event prototype", function(){
      var s = Snix.shell();
      expect(typeof(s.on)).toBe("function");
      expect(typeof(s.one)).toBe("function");
      expect(typeof(s.off)).toBe("function");
      expect(typeof(s.trigger)).toBe("function");
    });

    it("has an initial value of null", function(){
      expect(Snix.shell()()).toBeNull();
    });

    it("takes an initial value as argument", function(){
      expect(Snix.shell(100)()).toBe(100);
    });

    it("set and get a value", function(){
      var s = Snix.shell();
      s(100);
      expect(s()).toBe(100);
    });
  });

  describe("util", function(){
    it("returns an id as string of the passed argument", function(){
      expect(function(){
        Snix.idOf(null);
      }).toThrow("illegal argument");

      expect(Snix.idOf(10)).toBe("10");
      expect(Snix.idOf("abc")).toBe("abc");
      expect(Snix.idOf({id: 10})).toBe("10");
      expect(Snix.idOf({id: Snix.shell(10)})).toBe("10");
    });

    it("returns the unwrapped value of the shell or the passed argument as is if it is not a shell", function(){
      expect(Snix.unwrap(null)).toBeNull();
      expect(Snix.unwrap(10)).toBe(10);
      expect(Snix.unwrap("10")).toBe("10");
      expect(Snix.unwrap(Snix.shell(10))).toBe(10);
    });
  });

  describe("types", function(){

    it("behaves like a string", function(){
      expect(Snix.string()()).toBeNull();
      expect(Snix.string("abc")()).toBe("abc");

      expect(Snix.string()("abc ")()).toBe("abc");
      expect(Snix.string()(" abc")()).toBe("abc");
      expect(Snix.string()(" abc ")()).toBe("abc");

      expect(JSON.stringify(Snix.string("abc"))).toBe("\"abc\"");
    });

    it("behaves like an int", function(){
      expect(Snix.int()()).toBeNull();
      expect(Snix.int(10)()).toBe(10);

      expect(Snix.int()("10")()).toBe(10);
      expect(Snix.int()("10.1")()).toBe(10);

      expect(JSON.stringify(Snix.int(10))).toBe("10");
    });

    it("behaves like a float", function(){
      expect(Snix.float()()).toBeNull();
      expect(Snix.float(10.1)()).toBe(10.1);

      expect(Snix.float()("10")()).toBe(10.0);
      expect(Snix.float()("10.1")()).toBe(10.1);

      expect(JSON.stringify(Snix.float(10.1))).toBe("10.1");
    });

    it("behaves like a boolean", function(){
      expect(Snix.boolean()()).toBeNull();
      expect(Snix.boolean(true)()).toBe(true);
      expect(Snix.boolean(false)()).toBe(false);

      expect(Snix.boolean()("true")()).toBe(true);
      expect(Snix.boolean()("yes")()).toBe(true);
      expect(Snix.boolean()("false")()).toBe(false);
      expect(Snix.boolean()("no")()).toBe(false);

      expect(JSON.stringify(Snix.boolean(true))).toBe("true");
    });

    it("behaves like an enum", function(){
      var enu = Snix.enu("red", "yellow", "green");

      expect(function(){
        enu("white");
      }).toThrow("unknown in enumeration: white");

      expect(enu(null)).toBeNull();
      expect(enu("red").toString()).toEqual("red");
      expect(JSON.stringify(enu("red"))).toEqual("\"red\"");
    });

    it("behaves like a date", function(){
      var mom = moment();

      expect(Snix.moment()()).toBeNull();
      expect(Snix.moment()(mom)().toString()).toBe(mom.toString());
      expect(JSON.stringify(Snix.moment()(mom))).toBe(JSON.stringify(mom.toDate()));
      expect(Snix.moment(mom).format("YYYY-MM-DD")).toBe(mom.format("YYYY-MM-DD"));
    });

    it("behaves like an array", function(){
      expect(Snix.array()()).toEqual([]);
      expect(Snix.array([1,2,3])()).toEqual([1,2,3]);

      var arr = Snix.array();
      expect(arr.size()).toBe(0);
      expect(arr.isEmpty()).toBe(true);

      arr.add(1);
      expect(arr()).toEqual([1]);
      expect(arr.size()).toBe(1);
      expect(arr.isEmpty()).toBe(false);

      arr.remove(1);
      expect(arr.size()).toBe(0);
      expect(arr.isEmpty()).toBe(true);

      arr.add(1);
      arr.clear();
      expect(arr.size()).toBe(0);
      expect(arr.isEmpty()).toBe(true);

      expect(function(){
        Snix.array(1);
      }).toThrow("not an array");

      var joe = {name: "joe"},
          bob = {name: "bob"};

      arr([joe, bob]);
      expect(arr()).toEqual([joe, bob]);

      arr.sortAsc = false;
      arr.sort("name");
      expect(arr()).toEqual([bob, joe]);

      arr.sortAsc = true;
      arr.sort("name");
      expect(arr()).toEqual([joe, bob]);

    });
  });

  describe("array compute", function(){
    it("pluck", function(){

      var a = {id: 1, name: "a"},
          b = {id: 2, name: "b"};

      var arr = Snix.array([a, b]);

      var arr2 = arr.computePluck("name");
      expect(arr2()).toEqual(["a", "b"]);

      var c = {id: 3, name: Snix.shell("c")};
      arr.add(c);

      expect(arr2()).toEqual(["a", "b", "c"]);

      c.name("xyz");

      expect(arr2()).toEqual(["a", "b", "xyz"]);
    });

    describe("select", function(){
      it("returns a snix compute array", function(){
        var a = {id: 1, name: "a"},
            b = {id: 2, name: "b"},
            c = {id: 3, name: "c"};

        var arr = Snix.array([a, b, c]);
        var arr2 = arr.computeSelect(function(){ return true; });
        expect(arr2.__unwrap__).toBe(true);
        expect(arr2()).toEqual(arr());
      });

      it("compute array only contains entries for which fun returns true", function(){
        var a = {id: 1, name: Snix.shell("a")},
            b = {id: 2, name: Snix.shell("b")},
            c = {id: 3, name: Snix.shell("c")};

        var arr = Snix.array([a, b, c]);
        var arr2 = arr.computeSelect(function(e){ return e.id >= 2; });

        expect(arr2()).toEqual([b, c]);

        // add entry
        var d = {id: 4, "name": Snix.shell("d")};
        arr.add(d);

        expect(arr2()).toEqual([b, c, d]);

        // chain compute array
        var arr3 = arr2.computeSelect(function(e){ return e.name().length > 1});
        expect(arr3()).toEqual([]);

        b.name("abc");
        expect(arr3()).toEqual([b]);

        arr.remove(b);

        expect(arr3()).toEqual([]);
      });
    });
  });



  describe("rerun", function(){
    it("has initially no dependencies", function(){
      expect((new Snix.ReRun().dependencies)).toEqual([]);
    });

    it("invokes the passed function and returns the result", function(){
      var rr = new Snix.ReRun(function(){
        return 10;
      });
      expect(rr.run()).toBe(10);

      var obj = {};
      obj.name = "joe";

      rr = new Snix.ReRun(function(){
        return this.name;
      }, obj);
      expect(rr.run()).toBe("joe");
    });

    it("tracks any read shell and save them as dependencies", function(){
      var name = Snix.shell();
      var age = Snix.int(50);

      var rr = new Snix.ReRun(function(){
        return name();
      });
      rr.run();

      expect(rr.dependencies).toEqual([name]);

      // no duplicates
      rr.run();
      expect(rr.dependencies).toEqual([name]);

      rr = new Snix.ReRun(function(){
        return name() + ", " + age();
      });
      rr.run();

      expect(rr.dependencies).toEqual([name, age]);
    });

    it("invokes the passed function if any dependency changes", function(){
      var name = Snix.shell("joe");
      var cnt = 0;

      var rr = new Snix.ReRun(function(){
        cnt++;
        return name();
      });

      // not run 
      expect(cnt).toBe(0);
      
      // initial run
      rr.run();
      expect(cnt).toBe(1);

      // change triggers run 
      name("bob");
      expect(cnt).toBe(2);

      // no change
      name("bob");
      expect(cnt).toBe(2);
    });
  });

  describe("compute", function(){

    it("evaluates the passed function and returns the result, further calls simply return result without evaluating again", function(){
      var app = {name: Snix.shell()};
      var cnt = 0;

      var c = Snix.compute(function(){
        cnt++;
        return app.name();
      });

      // lazy
      expect(cnt).toBe(0);

      // first call
      expect(c()).toBeNull("");
      expect(cnt).toBe(1);

      // further call
      expect(c()).toBeNull("");
      expect(cnt).toBe(1);

      // pass bind context

      cnt = 0;
      c = Snix.compute(function(){
        cnt++;
        return this.name();
      }, app);

      // lazy
      expect(cnt).toBe(0);

      // first call
      expect(c()).toBeNull("");
      expect(cnt).toBe(1);

      // further call
      expect(c()).toBeNull("");
      expect(cnt).toBe(1);
    });

    it("evaluates the passed function again when calling refresh", function(){
      var app = {name: Snix.shell()};
      var cnt = 0;

      var c = Snix.compute(function(){
        cnt++;
        return app.name();
      });

      expect(c()).toBeNull();
      expect(cnt).toBe(1);

      c.refresh();

      expect(c()).toBeNull();
      expect(cnt).toBe(2);
    });

    it("evaluates the passed function again when any of the read shell values changes", function(){
      var name = Snix.shell("joe");
      var cnt = 0;

      var c = Snix.compute(function(){
        cnt++;
        return name();
      });

      expect(cnt).toBe(0);
      expect(c()).toBe("joe");
      expect(cnt).toBe(1);

      name("bob");
      expect(cnt).toBe(2);
      expect(c()).toBe("bob");
      expect(cnt).toBe(2);

      // no change
      name("bob");
      expect(cnt).toBe(2);
      expect(c()).toBe("bob");
      expect(cnt).toBe(2);

    });

    it("the passed fun will be invoked with an argument, the setter function, which can be used as an alternative to set a new value", function(){
      var c = Snix.compute(function(set){
        set("joe");
      });

      expect(c()).toBe("joe");
    });
  });

  describe("bindings", function(){


    it("text", function(){
      var app = {name: Snix.shell("joe")};
      var el = $("<span data-bind='text: @name'>abc</span>");

      Snix.binder(el, app, {});

      expect($(el).text()).toBe("joe");
      app.name("bob");
      expect($(el).text()).toBe("bob");
    });

    it("value", function(){
      var app = {name: Snix.shell("joe")};
      var el = $("<input type='text' data-bind='value: @name'/>");

      Snix.binder(el, app, {});

      expect($(el).val()).toBe("joe");

      $(el).val("bob").trigger("change");
      expect(app.name()).toBe("bob");

      app.name("joe");
      expect($(el).val()).toBe("joe");
    });

  });

  describe("validator", function(){

    it("contains initially no entries", function(){
      var v = new Snix.Validator();
      expect(v.entries()).toEqual([]);
      expect(v.isEmpty()).toBe(true);
    });

    it("validates against the passed hash of rules in the optionally passed context", function(){
      var v = new Snix.Validator();

      var app = {field: true};

      // valid
      v.validate({name: function(){ return this.field; }}, app);
      expect(v.isEmpty()).toBe(true);

      var f = v.field("name");
      expect(f.isInvalid()).toBe(false);

      // invalid
      v.validate({name: function(){ return false; }});
      expect(v.isEmpty()).toBe(false);

      var f = v.field("name");
      expect(f.isInvalid()).toBe(true);

      // clean
      v.clear();
      expect(v.isEmpty()).toBe(true);
    });

  });

});