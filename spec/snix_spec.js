describe("Snix", function(){

  it("sets the Snix.__caller__ attribute and applies fun against context, and restores the previous Snix.__caller__ value", function(){
    var caller = {};

    var obj = {
      fun: function(){
        expect(Snix.__caller__).toBe(caller);
      }
    };

    spyOn(obj, "fun").andCallThrough();
    Snix.call(obj.fun, caller, obj);

    expect(obj.fun).toHaveBeenCalled();
    expect(Snix.__caller__).toBeNull();

    obj.fun.reset();

    var existingCaller = {};
    try{
      Snix.__caller__ = existingCaller;

      Snix.call(obj.fun, caller, obj);

      expect(obj.fun).toHaveBeenCalled();
      expect(Snix.__caller__).toBe(existingCaller);
    }finally{
      Snix.__caller__ = null;
    }
  });

  describe("Types", function(){
    it("converts the passed value to an integer", function(){
      var v = Snix.int(10);
      expect(v()).toBe(10);
      v(20);
      expect(v()).toBe(20);
      v(null);
      expect(v()).toBeNull();
      v("30");
      expect(v()).toBe(30);
    });

    it("converts the passed value to a float", function(){
      var v = Snix.float(10.1);
      expect(v()).toBe(10.1);
      v(20.1);
      expect(v()).toBe(20.1);
      v(null);
      expect(v()).toBeNull();
      v("30.1");
      expect(v()).toBe(30.1);
    });

    it("converts the passed value to a boolean", function(){
      var v = Snix.boolean(true);
      expect(v()).toBeTruthy();
      expect(v(false)()).toBeFalsy();
      expect(v(null)()).toBeNull();
      expect(v("true")()).toBeTruthy();
      expect(v("false")()).toBeFalsy();
      expect(v("yes")()).toBeTruthy();
      expect(v("")()).toBeFalsy();
    });

    describe("Array", function(){
      it("fails when passing a non array value", function(){
        
        expect(function(){
          Snix.array({});
        }).toThrow("not an array");

        var v = Snix.array([]);

        expect(function(){
          v({});
        }).toThrow("not an array");

        var v = Snix.array([]);
        expect(v()).toEqual([]);
      });

      it("adds an entry to the array", function(){
        var v = Snix.array([]);
        v.add(10);
        expect(v()).toEqual([10]);
      });

      it("removes an entry from the array", function(){
        var v = Snix.array([10]);
        v.remove(10);
        expect(v()).toEqual([]);
      });

      it("returns the number of entries in the array", function(){
        var v = Snix.array([]);
        expect(v.size()).toBe(0);
        v.add(10);
        expect(v.size()).toBe(1);
      });

      it("returns true if the array has no entries, false otherwise", function(){
        var v = Snix.array([]);
        expect(v.isEmpty()).toBeTruthy();
        v.add(10);
        expect(v.isEmpty()).toBeFalsy();
      });

      it("removes all entries from the array", function(){
        var v = Snix.array([1,2,3]);
        v.clear();
        expect(v()).toEqual([]);
      });
    });
  });

  it("returns the unwrapped value of a snix function", function(){
    var fun = new Snix.Value(100).fun();
    expect(Snix.unwrap(fun)).toBe(100);
    expect(Snix.unwrap(100)).toBe(100);
  });

  it("serialiazes to the underlying value in JSON.stringified", function(){
    var v1 = new Snix.Value(100);
    var f1 = v1.fun();

    expect(JSON.stringify(f1)).toBe("100");

    var f2 = Snix.compute(function(){
      return f1() * 2;
    });

    expect(JSON.stringify(f2)).toBe("200");

    var enu = Snix.enu("joe", "bob");
    expect(JSON.stringify(enu("joe"))).toBe('"joe"');

    // calls toJSON on underlying value if exists
    expect(JSON.stringify(Snix.val(enu("joe")))).toBe('"joe"');
  });

  describe("Value", function(){

    it("can not be created without passing a valueProvider", function(){
      expect(function(){
        new Snix.Value();
      }).toThrow("missing valueProvider");

      expect(function(){
        new Snix.Value(undefined);
      }).toThrow("missing valueProvider");

      expect(typeof(new Snix.Value(10))).toBe("object");
      expect(typeof(new Snix.Value([]))).toBe("object");
      expect(typeof(new Snix.Value({}))).toBe("object");
      expect(typeof(new Snix.Value(false))).toBe("object");
      expect(typeof(new Snix.Value(true))).toBe("object");
      expect(typeof(new Snix.Value(null))).toBe("object");
    });

    it("initialized its attributes", function(){
      var v = new Snix.Value(10);
      expect(v.dependants).toEqual([]);
      expect(v.isValueAssigned).toBeFalsy();
      expect(v.value).toBeNull();
      expect(v.valueProvider).toBe(10);
      expect(v.isDisposed).toBeFalsy();
    });

    it("returns valueProvider as is or invokes valueProvider if it is an function and returns the result", function(){
      expect(new Snix.Value(10).provideValue()).toBe(10);
      expect(new Snix.Value(function(){
        return 100;
      }).provideValue()).toBe(100);
    });

    it("if Snix.__caller__ is set, it will be added to the dependants list of this", function(){
      var v = new Snix.Value(10);

      v.trackCaller();
      expect(v.dependants).toEqual([]);

      try{
        Snix.__caller__ = {};
  
        v.trackCaller();
        expect(v.dependants).toEqual([Snix.__caller__]);

        v.trackCaller();
        expect(v.dependants).toEqual([Snix.__caller__]); // no duplicates will be added
      }finally{
        Snix.__caller__ = null;
      }
    });

    it("clears out dependants on dispose", function(){
      var v = new Snix.Value(10);

      var x = new Snix.Value(function(){
        try{
          Snix.__caller__ = x;
          return v.get();
        }finally{
          Snix.__caller__ = null;
        }
      });
      expect(v.dependants).toEqual([]); // x() has not evaluated yet (lazy)

      x.get();
      expect(v.dependants).toEqual([x]);

      var y = new Snix.Value(function(){
        try{
          Snix.__caller__ = y;
          return v.get();
        }finally{
          Snix.__caller__ = null;
        }
      });
      expect(v.dependants).toEqual([x]); //y() has not evaluated yet (lazy)

      y.get();
      expect(v.dependants).toEqual([x, y]);

      v.dispose();
      expect(v.dependants).toEqual();
      expect(v.isDisposed).toBeTruthy();
    });

    it("releases this when passing true as argument to dispose", function(){
      var v = new Snix.Value(10);
      v.dispose(true);

      expect(v.dependants).toBeNull();
      expect(v.isValueAssigned).toBeNull();
      expect(v.value).toBeNull();
      expect(v.valueProvider).toBeNull();

      expect(function(){
        v.get();
      }).toThrow("disposed");

      expect(function(){
        v.set(100);
      }).toThrow("disposed");
    });

    it("sets a new value", function(){
      var v = new Snix.Value(10);

      // valueProvider gets only called when using .get() method
      expect(v.value).toBeNull();

      spyOn(v, "convert").andCallThrough();
      spyOn(v, "triggerDependants");

      v.set(100);
      expect(v.value).toBe(100);
      expect(v.convert).toHaveBeenCalledWith(100);
      expect(v.triggerDependants).toHaveBeenCalled();
      v.convert.reset();
      v.triggerDependants.reset();

      v.set(200);
      expect(v.value).toBe(200);
      expect(v.convert).toHaveBeenCalledWith(200);
      expect(v.triggerDependants).toHaveBeenCalled();
      v.convert.reset();
      v.triggerDependants.reset();

      v.set(200);
      expect(v.value).toBe(200);
      // value has not been changed
      expect(v.triggerDependants).not.toHaveBeenCalled();
    });

    it("gets a value", function(){
      var v = new Snix.Value(10);

      spyOn(v, "trackCaller").andCallThrough();
      spyOn(v, "provideValue").andCallThrough();

      expect(v.get()).toBe(10);
      expect(v.isValueAssigned).toBeTruthy();
      expect(v.trackCaller).toHaveBeenCalled();
      expect(v.provideValue).toHaveBeenCalled();

      v.trackCaller.reset();
      v.provideValue.reset();

      expect(v.get()).toBe(10);
      expect(v.trackCaller).toHaveBeenCalled();
      // value already exist
      expect(v.provideValue).not.toHaveBeenCalled();
    });

    it("returns a snix function which calls get() when invokes without arguments and set() when arguments exist", function(){
      var v = new Snix.Value(10);
      var fun = v.fun();

      expect(fun.__snix__).toBeTruthy();

      expect(typeof(fun)).toBe("function");
      expect(fun()).toBe(10);

      fun(100);
      expect(fun()).toBe(100);

      var res = fun(200);
      expect(res).toBe(fun);
    });

    it("returns the passed value back as is", function(){
      var obj = {};
      expect(new Snix.Value(10).convert(obj)).toBe(obj);
    });
  });

  it("can add subscribers", function(){
    var v = Snix.val(10);

    var expectedValue = 10;

    var obj = {
      fun: function(newValue){
        expect(v()).toBe(expectedValue);
        expect(newValue).toBe(expectedValue);
      }
    };

    spyOn(obj, "fun").andCallThrough();

    v.subscribe(obj.fun, obj);

    expect(obj.fun).toHaveBeenCalled();
    obj.fun.reset();

    expectedValue = 100;
    v(100);
    expect(obj.fun).toHaveBeenCalled();

    obj.fun.reset();
    v.unsubscribe(obj.fun);

    v(200);
    expect(obj.fun).not.toHaveBeenCalled();
  });

  it("computes some nested values", function(){
    var x = Snix.val(100);

    var y = Snix.compute(function(){
      return x() * 2;
    });

    var abc = Snix.compute(function(){
      return y() + z();
    }, this, {lazy: true});

    var z = Snix.compute(function(){
      return x() * 2;
    });

    x(200);
  });

  it("array test", function(){
    var arr = Snix.array();

    var c = Snix.compute(function(){
      return _.select(arr(), function(e){ 
        return e.active() == true; 
      });
    });

    c();

    expect(arr.__value__.dependants.length).toBe(1);
    expect(_.include(arr.__value__.dependants, c.__value__)).toBeTruthy();

    expect(c()).toEqual([]);

    arr([
      {name: "e1", active: Snix.boolean(false)}
    ]);

    expect(c()).toEqual([]);

    arr()[0].active(true);

    expect(c()).toEqual([arr()[0]]);
  });

  describe("Bindings", function(){

    beforeEach(function(){  $("#snix").empty(); });
    afterEach(function(){   $("#snix").empty(); });

    it("select", function(){
      var app = {};
      app.entries = Snix.array([
        {id: 1, name: 'e1'},
        {id: 2, name: 'e2'}
      ]);

      // app.entries();

      $("#snix").append("<select data-bind=\"select: {entries: @entries, label: 'name'}\"></select>")

      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix option").length).toBe(3); // 2 entries + 1 caption
    });

    it("text", function(){
      var app = {
        name: Snix.val("joe")
      };

      $("#snix").append("<span data-bind=\"text: @name\"></span>");
      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix span").text()).toBe("joe");

      app.name("bob");

      expect($("#snix span").text()).toBe("bob");
    });

    it("text", function(){
      var app = {
        name: Snix.val("joe")
      };

      $("#snix").append("<input type='text' data-bind=\"value: @name\"/>");
      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix input").val()).toBe("joe");

      app.name("bob");

      expect($("#snix input").val()).toBe("bob");

      $("#snix input").val("jim").trigger("change");

      expect(app.name()).toBe("jim");
    });

    it("check", function(){
      var app = {
        done: Snix.boolean(false)
      };

      $("#snix").append("<input type='checkbox' data-bind=\"check: @done\"/>");
      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix input").is(":checked")).toBeFalsy();

      app.done(true);

      expect($("#snix input").is(":checked")).toBeTruthy();

      $("#snix input").removeAttr("checked").trigger("change");

      expect(app.done()).toBeFalsy();

      $("#snix input").attr("checked", "checked").trigger("change");

      expect(app.done()).toBeTruthy();
    });

    it("click", function(){
      var app = {
        action: function(){}
      };

      $("#snix").append("<a href='#' data-bind=\"click: @action()\"/>");
      Snix.Binding.binden(app, $("#snix")[0]);

      spyOn(app, "action");

      $("#snix a").trigger("click");

      expect(app.action).toHaveBeenCalled();
    });

    it("css", function(){
      var app = {
        done: Snix.boolean(false)
      };

      $("#snix").append("<span data-bind=\"css: {myClazz: @done()}\"></span>");
      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix span").hasClass("myClazz")).toBeFalsy();

      app.done(true);
      expect($("#snix span").hasClass("myClazz")).toBeTruthy();

      app.done(false);
      expect($("#snix span").hasClass("myClazz")).toBeFalsy();
    });

    it("loop", function(){
      var app = {};

      var e1 = {id: 1, name: 'e1'};
      var e2 = {id: 2, name: 'e2'};

      app.entries = Snix.array([e1, e2]);

      $("#snix").append("<ul data-bind=\"loop: {entries: @entries, as: 'entry'}\"><li><span data-bind=\"text: entry.name\"></span></li></ul>");
      Snix.Binding.binden(app, $("#snix")[0]);

      expect($("#snix ul").children().length).toBe(2);
      
      expect($("#snix ul li:nth-child(1)").attr("data-id")).toBe("1");
      expect($("#snix ul li:nth-child(1) span").text()).toBe("e1");

      expect($("#snix ul li:nth-child(2)").attr("data-id")).toBe("2");
      expect($("#snix ul li:nth-child(2) span").text()).toBe("e2");

      app.entries.remove(e2);

      expect($("#snix ul").children().length).toBe(1);

      expect($("#snix ul li:nth-child(1)").attr("data-id")).toBe("1");
      expect($("#snix ul li:nth-child(1) span").text()).toBe("e1");

      app.entries.add({id: 3, name: 'e3'});

      expect($("#snix ul").children().length).toBe(2);

      expect($("#snix ul li:nth-child(1)").attr("data-id")).toBe("1");
      expect($("#snix ul li:nth-child(1) span").text()).toBe("e1");

      expect($("#snix ul li:nth-child(2)").attr("data-id")).toBe("3");
      expect($("#snix ul li:nth-child(2) span").text()).toBe("e3");
    });

  });

});