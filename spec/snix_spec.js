var the = it, you = it, on = it, when = it;

describe("Snix", function(){

  describe("Value", function(){

    beforeEach(function(){
      Snix.__caller__ = null;
    });

    the("value property is initially undefined", function(){
      expect(new Snix.Value().value).toBeUndefined();
    });

    the("dependants is initially empty", function(){
      expect(new Snix.Value().dependants).toEqual([]);
    });

    it("is initially not disposed", function(){
      expect(new Snix.Value().isDisposed).toBeFalsy();
    });

    it("disposes the value", function(){
      var v = new Snix.Value();
      v.dispose();

      expect(v.isDisposed).toBeTruthy();

      // null the value
      v = new Snix.Value(100);
      v.dispose(true);

      expect(v.get()).toBeNull();

      // do not null the value
      v = new Snix.Value(100);
      v.dispose();

      expect(v.get()).toBe(100);
    });

    it("has no initial subscriptions", function(){
      expect(new Snix.Value().subscriptions).toEqual([]);
    });

    it("can add and remove subscriber", function(){
      var v = new Snix.Value();
      var f = function(){};

      // subscribe without context
      v.subscribe(f);
      expect(v.subscriptions).toEqual([[f, v]]);

      v.unsubscribe(f);
      expect(v.subscriptions).toEqual([]);

      // subscribe with context

      var ctx = {};

      v.subscribe(f, ctx);
      expect(v.subscriptions).toEqual([[f, ctx]]);

      v.unsubscribe(f);
      expect(v.subscriptions).toEqual([]);
    });

    it("sets the caller property, invokes the function and restores the previous caller", function(){

      var obj = {
        fun: function(){
          expect(Snix.__caller__).toBeNull();
        }
      };

      spyOn(obj, "fun").andCallThrough();

      Snix.callAs(obj.fun, null);
      expect(obj.fun).toHaveBeenCalled();

      obj.fun.reset();

      var caller = {};

      obj = {
        fun: function(){
          expect(Snix.__caller__).toBe(caller);
        }
      };

      spyOn(obj, "fun").andCallThrough();

      Snix.callAs(obj.fun, caller);
      expect(obj.fun).toHaveBeenCalled();
    });

    it("removes disposed dependants on set", function(){
      var v = new Snix.Value(100);

      var dep = {evalValue: (function(){}), value: 200, isDisposed: false};
      v.dependants.push(dep);

      v.set(10);
      expect(v.dependants.length).toBe(1);

      dep.isDisposed = true;

      v.set(20);
      expect(v.dependants.length).toBe(0);
    });

    you("can pass a value as initial value", function(){
      expect(new Snix.Value(100).value).toBe(100);
    });

    the("get function call trackCaller and returns the value property", function(){
      var v = new Snix.Value(100);

      spyOn(v, "trackCaller").andCallThrough();

      expect(v.get()).toBe(100);
      expect(v.trackCaller).toHaveBeenCalled();
    });

    on("trackCaller we check if Snix.__caller__ exists and add it to the dependants property", function(){
      var v = new Snix.Value(100);

      // without __caller__ exists

      v.trackCaller();
      expect(v.dependants).toEqual([]);

      // with __caller__
      Snix.__caller__ = {};

      v.trackCaller();
      expect(v.dependants.length).toBe(1);
      expect(v.dependants[0]).toBe(Snix.__caller__);

      // no duplicates

      v.trackCaller();
      expect(v.dependants.length).toBe(1);
      expect(v.dependants[0]).toBe(Snix.__caller__);
    });

    it("unwrap the value of an Snix value", function(){
      var v = Snix.val(10);
      expect(Snix.unwrap(v)).toBe(10);

      // non Snix values will be returned as is
      expect(Snix.unwrap(10)).toBe(10);
      expect(Snix.unwrap(null)).toBeNull();
    });

    describe("fun property", function(){
      it("is a function", function(){
        expect(typeof(new Snix.Value().fun)).toBe("function");
      });

      it("calls get and returns the result when called without arguments", function(){
        var v = new Snix.Value(100);
        spyOn(v, "get").andCallThrough();

        expect(v.fun()).toBe(100);
        expect(v.get).toHaveBeenCalled();
      });

      it("calls set when called with arguments, passing the first argument value", function(){
        var v = new Snix.Value(10);
        spyOn(v, "set").andCallThrough();

        v.fun(100);
        expect(v.set).toHaveBeenCalledWith(100);
        expect(v.value).toBe(100);
      });

    });
  });

  describe("val", function(){
    it("returns a function", function(){
      expect(typeof(Snix.val())).toBe("function");
    });

    it("returns the underlying value when called without arguments", function(){
      expect(Snix.val()()).toBeNull();
      expect(Snix.val(10)()).toBe(10);
    });

    it("sets the underlying value when called with at least one argument", function(){
      var v = Snix.val();
      v(10);
      expect(v()).toBe(10);
    });
  });

  describe("compute", function(){
    it("returns a function", function(){
      expect(typeof(Snix.compute())).toBe("function");
    });

    it("calls reader function and returns the result when called without arguments", function(){
      var c = Snix.compute(function(){ return 10; });
      expect(c()).toBe(10);
    });

    it("calls the reader once", function(){
      var obj = {reader: function(){ return 10; }};
      
      spyOn(obj, "reader").andCallThrough();

      var c = Snix.compute(obj.reader);
      c();
      c();

      expect(obj.reader).toHaveBeenCalled();
      expect(obj.reader.callCount).toBe(1);
    });

    it("recalls the reader if any Snixs, accessed in reader, changes its underlying value", function(){
      var v = Snix.val(10);
      var c = Snix.compute(function(){
        return v() * 2;
      });

      expect(c()).toBe(20);
      
      v(20);
      expect(c()).toBe(40);


      var c2 = Snix.compute(function(){
        return c() * 2;
      });

      expect(c2()).toBe(80);

      v(30);
      expect(c()).toBe(60);
      expect(c2()).toBe(120);

      v(40);
      expect(c2()).toBe(160);
      expect(c()).toBe(80);
    });
  });

  describe("intVal", function(){
    it("translate the passed value to an int", function(){
      var v = Snix.intVal(10);
      v(null);
      expect(v()).toBeNull();
      v(10);
      expect(v()).toBe(10);
      v("100");
      expect(v()).toBe(100);
    });
  });

  describe("floatVal", function(){
    it("translate the passed value to a float", function(){
      var v = Snix.floatVal(10.0);
      v(null);
      expect(v()).toBeNull();
      v(10.0);
      expect(v()).toBe(10.0);
      v("100.0");
      expect(v()).toBe(100.0);
    });
  });

  describe("boolVal", function(){
    it("translate the passed value to a float", function(){
      var v = Snix.boolVal();
      v(null);
      expect(v()).toBeNull();

      v(false);
      expect(v()).toBeFalsy();

      v(true);
      expect(v()).toBeTruthy();

      v(null);
      expect(v()).toBeFalsy();

      v("true");
      expect(v()).toBeTruthy();

      v(null);
      expect(v()).toBeFalsy();

      v("yes");
      expect(v()).toBeTruthy();
    });
  });

  describe("array", function(){
    it("adds an entry", function(){
      var v = Snix.array([]);
      v.add(10);
      expect(v()).toEqual([10]);
    });

    it("removed an entry", function(){
      var v = Snix.array([10]);
      v.remove(10);
      expect(v()).toEqual([]);
    });

    it("removes all entries", function(){
      var v = Snix.array([10, 20]);
      v.clear();
      expect(v()).toEqual([]);
    });

    it("returns the length of the underlying array", function(){
      var v = Snix.array([10]);
      expect(v.size()).toBe(1);
    });

    it("returns true if the array is empty, false otherwise", function(){
      var v = Snix.array([]);
      expect(v.isEmpty()).toBeTruthy();

      v.add(10);
      expect(v.isEmpty()).toBeFalsy();
    });
  });
});