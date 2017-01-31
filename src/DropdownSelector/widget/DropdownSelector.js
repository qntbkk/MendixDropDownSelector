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
    "dojo/dom-attr",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/_base/lang",
    "dojo/text",
    "dojo/html",
    "dojo/_base/event",
    "dojo/on",

    "dojo/text!DropdownSelector/widget/template/DropdownSelector.html"
], function (declare, _WidgetBase, _TemplatedMixin, dom, dojoDom, dojoQuery, dojoTraverse, dojoProp, dojoGeometry, dojoClass, dojoStyle, dojoAttr, dojoConstruct, dojoArray, dojoLang, dojoText, dojoHtml, dojoEvent, dojoOn, widgetTemplate) {
    "use strict";

    // Declare widget's prototype.
    return declare("DropdownSelector.widget.DropdownSelector", [ _WidgetBase, _TemplatedMixin ], {
        // _TemplatedMixin will create our dom node using this HTML template.
        templateString: widgetTemplate,

        // DOM elements

        // Parameters configured in the Modeler.
        placeholderText: "",
        targetName: "",
        mfOnChange: "",
        renderingMode: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _handles: null,
        _eventHandles: null,
        _contextObj: null,
        _formGroupNode: null,
        _selectNode: null,
        _optionDomArray: null,
        _optionArray: null,
        _newOptionDomArray: null,
        _selectedIndex: null,
        _allSelectDropdowns: {},

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._handles = [];
            this._eventHandles = [];
            this._optionDomArray = [];
            this._optionArray = [];
            this._newOptionDomArray = [];
        },

        // dijit._WidgetBase.postCreate is called after constructing the widget. Implement to do extra setup work.
        postCreate: function () {
            logger.debug(this.id + ".postCreate");
            this.targetName = ".mx-name-" + this.targetName;
            this._allSelectDropdowns[this.id] = this;
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
                //dojoClass.add(this._formGroupNode, "relative"); //TODO check if this is needed
                this._selectNode = dojoQuery('select',this._formGroupNode)[0];
            } else {
                return;
            }
            if (this._selectNode) {
                // create an array with all the possible options
                this._selectedIndex = this._selectNode.options.selectedIndex;
                this._optionDomArray = dojoQuery('option',this._selectNode);
                this._optionArray = [];
                dojoArray.forEach(this._optionDomArray,dojoLang.hitch(this, function(option){
                    var optionElement = {index: option.index, value: option.value, text: option.text};
                    if (optionElement.text == "") {
                        optionElement.text = this.placeholderText;
                    }
                    this._optionArray.push(optionElement);
                }));
            } else {
                return;
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

             switch(this.renderingMode) {
                case "full":
                    // set event to the button
                    this.connect(this.selectDropdownButton, "click", dojoLang.hitch(this,this._clickedDropdown));

                    // set event to window for automatically closing the
                    this.connect(document, "click", dojoLang.hitch(this,function(event){
                        // if a widget external click is made: close the menu if open
                        var isOpenString = dojoAttr.get(this.selectDropdownButton,"aria-expanded")
                        if (isOpenString == "true") {
                            this._toggleDropdown(isOpenString);
                        }
                    }));

                    // set events to the listitems
                    dojoArray.forEach(this._newOptionDomArray, dojoLang.hitch(this, function(listItem){
                        var link = dojoTraverse(listItem).children()[0];
                        this.connect(link, "click", dojoLang.hitch(this, this._listItemClicked))
                    }));
                    break;
                case "default":
                default:
                    this._eventHandles.push(
                        this.connect(this._selectNode, "click", dojoLang.hitch(this, function(e){
                            console.log("just clicked the bitch");
                        }))
                    );

                     this._eventHandles.push(
                         this.connect(this._selectNode, "change", dojoLang.hitch(this, function(e){
                            var newIndex = e.currentTarget.options.selectedIndex;

                            if (newIndex > 0) {
                                dojoClass.add(this._selectNode, "option-selected");
                            } else {
                                dojoClass.remove(this._selectNode, "option-selected");
                            }

                            console.log("changed the bitch to " + newIndex);
                        }))
                     );
                    break;
            }

            /*this.connect(this.infoTextNode, "click", function (e) {
                // Only on mobile stop event bubbling!
                this._stopBubblingEventOnMobile(e);

                // If a microflow has been set execute the microflow on a click.
                if (this.mfOnChange !== "") {
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
                case "full":
                    console.log("full rendering enabled");

                    //  this.selectValueFieldNode.placeholder = this.placeholderText;
                    // move the custom widget dom 
                    dojoConstruct.place(this.domNode,this._formGroupNode,1);

                    // create the list items
                    dojoArray.forEach(this._optionArray,dojoLang.hitch(this, function(option){
                        this._createListItem(option, this.dropdownSelectorMenuNode); 
                    }));

                    // set the buttontext and styling
                    dojoAttr.set(this.selectValueFieldNode,"data-placeholder", this.placeholderText);
                    this._setSelectButton (this.selectValueFieldNode);

                    break;
                case "default":
                default:
                    // destroy the template since we won't be using it
                    dojoConstruct.destroy(this.domNode);
                    // create the placeholder functionality in original option
                    if (this._optionDomArray[0]){
                        this._optionDomArray[0].innerHTML = this.placeholderText;
                    }
                    console.log("default only placeholder selected");
                    break;
            }
            
            logger.debug(this.id + "._updateRendering");

            this._setupEvents(callback);  
        },

        _createListItem: function(option, listNode) {
            var newListItemNode,
                newLinkNode,
                selected = false;
            
            if (option.index == this._selectedIndex) {
                selected = true;
            }
            // create the html of the new listitem.
            newLinkNode = dojoConstruct.create("a", {role:"option", "data-value":option.value, innerHTML: option.text});
            if (selected) {
                dojoAttr.set(newLinkNode, "aria-selected", "selected");
            }
            newListItemNode = dojoConstruct.create("li", {"data-original-index": option.index});
            if (selected) {
                dojoClass.add(newListItemNode,"selected");
            }
            dojoConstruct.place(newLinkNode,newListItemNode,"last");
            // finally, add the new li element to the list
            dojoConstruct.place(newListItemNode, listNode);
            // store the doms for later usage
            this._newOptionDomArray.push(newListItemNode);
        },

        _setSelectButton: function(selectButton) {
            if (this._selectedIndex == 0) {
                // no item is selected - placeholder functionality
                //selectButton.innerHTML = dojoAttr.get(selectButton,'data-placeholder');
                dojoClass.add(selectButton,'placeholder');
            } else {
                // we have a selected item
                var selectedOption = this._optionArray[this._selectedIndex];
                selectButton.innerHTML = selectedOption.text;
                dojoClass.remove(selectButton,'placeholder');
            }
        },

        _clickedDropdown: function(event) {
            event.stopPropagation();
            var isOpenString = dojoAttr.get(event.currentTarget,"aria-expanded");
            // check if the menu is opening up: if so: close all the others
            if (isOpenString == "false") {
                this._closeAllDropDowns();
            }
            // toggle the menu
            this._toggleDropdown(isOpenString);
            console.log ('just clicked the input field hoor');
        },

        _toggleDropdown: function(isOpenString) {
            if (isOpenString == "false") {
                // closed menu - so open it up
                dojoClass.add(this.domNode, "open");
                dojoAttr.set(this.selectDropdownButton,"aria-expanded","true");
            } else {
                // open menu - so close it
                dojoClass.remove(this.domNode, "open");
                dojoAttr.set(this.selectDropdownButton,"aria-expanded","false");
            }
        },

        // method meant for if more than one select field is present in the page and they need to close each other
        _closeAllDropDowns: function() {
            var dropdown = null;

            for(dropdown in this._allSelectDropdowns) {
                if (this._allSelectDropdowns.hasOwnProperty(dropdown) && dropdown !== this.id){
                    var dropdownMenu = this._allSelectDropdowns[dropdown];
                    if (dropdownMenu.hasOwnProperty("selectDropdownButton")) {
                        var isOpenString = dojoAttr.get(dropdownMenu.selectDropdownButton,"aria-expanded");
                        if (isOpenString == "true") {
                            dojoClass.remove(dropdownMenu.domNode,"open");
                            dojoAttr.set(dropdownMenu.selectDropdownButton,"aria-expanded","false"); 
                        }
                    }
                }     
            }
        },

        _listItemClicked: function(event) {
            var listItem,
                newIndex;

            listItem = dojoTraverse(event.currentTarget).parent()[0];
            newIndex = Number(dojoAttr.get(listItem,"data-original-index"));
            this._setNewIndex(newIndex);
        },

        _setNewIndex: function(newIndex) {
            console.log("setting new index to: " + newIndex);
            // first adjust the new dropdown - begin with removing the older one
            var oldListItem = this._newOptionDomArray[this._selectedIndex],
                oldListLink = dojoTraverse(oldListItem).children()[0],
                newListItem,
                newListLink;
            
            dojoClass.remove(oldListItem,"selected");
            dojoAttr.set(oldListLink,"aria-selected","false");

            this._selectedIndex = newIndex;
            // - add the newer one
            newListItem = this._newOptionDomArray[newIndex];
            newListLink = dojoTraverse(newListItem).children()[0];
            dojoClass.add(newListItem,"selected");
            dojoAttr.set(newListLink,"aria-selected","true");
            // set the button text and style
            this._setSelectButton(this.selectDropdownButton);
            
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, function (handle) {
                  mx.data.unsubscribe(handle);
              });
              this._handles = [];
          }

          if ( this._eventHandles) {
              dojoArray.forEach( this._eventHandles,function( eventHandle){
                  this.disconnect(eventHandle);
              });
               this._eventHandles = [];
          }

          /* type hier custom events bij */
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
