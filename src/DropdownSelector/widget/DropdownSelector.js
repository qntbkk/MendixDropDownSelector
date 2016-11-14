/*global logger*/
/*
    DropdownSelector
    ========================

    @file      : DropdownSelector.js
    @version   : 1.0.0
    @author    : Willem Gorisse
    @date      : 11/3/2016
    @copyright : Mendix 2016
    @license   : Apache 2

    Documentation
    ========================
    Enhancement of the standard html form dropdown element for usability and UX purposes. Adds a placeholder functionality as well as the creation of a stylable version of the dropdown and it's elements.
*/

// Required module list. Remove unnecessary modules, you can always get them back from the boilerplate.
define([
    "dojo/_base/declare",
    "mxui/widget/_WidgetBase",
    "dijit/_TemplatedMixin",

    "mxui/dom",
    "dojo/dom",
    "dojo/query",
    "dojo/NodeList-traverse",
    "dojo/dom-prop",
    "dojo/dom-geometry",
    "dojo/dom-class",
    "dojo/dom-style",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",

    "dojo/text!DropdownSelector/widget/template/DropdownSelector.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoQuery, dojoTraverse, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("DropdownSelector.widget.DropdownSelector", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements

        // Parameters configured in the Modeler.
        placeholderText: "",
        targetName: "",
        mfToExecute: "",
        renderingMode: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _contextObj: null,
        _formGroupNode: null,
        _selectNode: null,
        _optionDomArray: null,
        _optionArray: null,
        _selectedIndex: null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
            this._optionDomArray = [];
            this._optionArray = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this.targetName = ".mx-name-" + this.targetName;
        },

        // mxui.widget._WidgetBase.update is called when context is changed or initialized. Implement to re-render and / or fetch data.
        update: function (obj, callback) {
            console.log("updating widget");
            logger.debug(this.id + ".update");
            this._contextObj = obj;

            // find all nodes
            this._formGroupNode = dojoQuery(this.targetName);
            this._formGroupNode = this._formGroupNode[0];
            if (this._formGroupNode) {
                dojoClass.add(this._formGroupNode, "relative");
                this._selectNode = dojoQuery('select',this._formGroupNode)[0];
            }
            if (this._selectNode) {
                this._selectedIndex = this._selectNode.options.selectedIndex;
                this._optionDomArray = dojoQuery('option',this._selectNode);
                this._optionArray = [];
                dojoArray.forEach(this._optionDomArray,dojoLang.hitch(this, function(option){
                    var optionElement = {value: option.value, text: option.text};
                    if (optionElement.text == "") {
                        optionElement.text = this.placeholderText;
                    }
                    this._optionArray.push(optionElement);
                }));
            }
            this._resetSubscriptions(callback);
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
          logger.debug(this.id + ".enable");
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
          logger.debug(this.id + ".disable");
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
            // Clean up listeners, helper objects, etc. There is no need to remove listeners added with this.connect / this.subscribe / this.own.
        },

        // We want to stop events on a mobile device
        _stopBubblingEventOnMobile: function (e) {
            logger.debug(this.id + "._stopBubblingEventOnMobile");
            if (typeof document.ontouchstart !== "undefined") {
                dojoEvent.stop(e);
            }
        },

        // Attach events to HTML dom elements
        _setupEvents: function (callback) {
            logger.debug(this.id + "._setupEvents");

            this.connect(this._selectNode, "click", dojoLang.hitch(this, function(e){
                console.log("just clicked the bitch");
            }));

            this.connect(this._selectNode, "change", dojoLang.hitch(this, function(e){
                var newIndex = e.currentTarget.options.selectedIndex;

                if (newIndex > 0) {
                   dojoClass.add(this._selectNode, "option-selected");
                } else {
                   dojoClass.remove(this._selectNode, "option-selected");
                }

                console.log("changed the bitch to " + newIndex);
            }));

            /*this.connect(this.infoTextNode, "click", function (e) {
                // Only on mobile stop event bubbling!
                this._stopBubblingEventOnMobile(e);

                // If a microflow has been set execute the microflow on a click.
                if (this.mfToExecute !== "") {
                    mx.data.action({
                        params: {
                            applyto: "selection",
                            actionname: this.mfToExecute,
                            guids: [ this._contextObj.getGuid() ]
                        },
                        store: {
                            caller: this.mxform
                        },
                        callback: function (obj) {
                            //TODO what to do when all is ok!
                        },
                        error: dojoLang.hitch(this, function (error) {
                            logger.error(this.id + ": An error occurred while executing microflow: " + error.description);
                        })
                    }, this);
                }
            });*/
            
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            mendix.lang.nullExec(callback);
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            switch(this.renderingMode) {
                case "onlySelect":
                    console.log("onlyseelct selected");
                    dojoConstruct.destroy(this.dropdownSelectorMenuNode);

                    this.selectValueFieldNode.placeholder = this.placeholderText;

                    break;
                case "full":
                    console.log("full rendering enabled");

                  //  this.selectValueFieldNode.placeholder = this.placeholderText;

                    break;
                case "default":
                default:
                    dojoConstruct.destroy(this.domNode);
                    console.log("default only placeholder selected");
                    break;
            }
            
            logger.debug(this.id + "._updateRendering");
            // create the placeholder functionality in original option
            if (this._optionDomArray[0]){
                this._optionDomArray[0].innerHTML = this.placeholderText;
            }
            // move the custom widget dom 
            dojoConstruct.place(this.domNode,this._formGroupNode,1);
            
            // create the list items

            this._setupEvents(callback);  
        },

        _createListItem: function(item) {
            var liNode = "<li data-option data-value";
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  mx.data.unsubscribe(handle);
              });
              this._handles = [];
          }
        },

        // Reset subscriptions.
        _resetSubscriptions: function (callback) {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this._updateRendering();
                    })
                });
                this._handles = [ objectHandle ];
            }
            
            this._updateRendering(callback);
        }
    });
});

require(["DropdownSelector/widget/DropdownSelector"]);
