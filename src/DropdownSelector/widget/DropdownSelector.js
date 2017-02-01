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
        _goingOnce: null,

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
                logger.debug("there was no Mendix widget found with the specified target name");
                callback();
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
                logger.debug("there was no select element found withing the specified Mendix widget");
                callback();
                return;
            }
            this._resetSubscriptions();
            this._updateRendering(callback());
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
            console.log("want to enable editing");
            logger.debug(this.id + ".enable");
            switch(this.renderingMode){
                case "full":

                    dojoConstruct.place(this.domNode,this._formGroupNode,1);
                    break;
                case "default":
                default:
                    break;
            }
        },

        // mxui.widget._WidgetBase.enable is called when the widget should disable editing. Implement to disable editing if widget is input widget.
        disable: function () {
            console.log("want to disable editing");
            logger.debug(this.id + ".disable");
            switch(this.renderingMode) {
                case "full":
                    //dojoStyle.set(this.domNode,"display","none");
                    // TODO: testing destroy as a way
                    if ( this._eventHandles) {
                        dojoArray.forEach( this._eventHandles, dojoLang.hitch(this, function( eventHandle){
                            this.disconnect(eventHandle);
                        }));
                        this._eventHandles = [];
                    }
                    dojoConstruct.destroy(this.domNode);
                    break;
                case "default":
                default:
                    // do nothing, only relevant for versions where
                    break;
            }
        },

        // mxui.widget._WidgetBase.resize is called when the page's layout is recalculated. Implement to do sizing calculations. Prefer using CSS instead.
        resize: function (box) {
          logger.debug(this.id + ".resize");
        },

        // mxui.widget._WidgetBase.uninitialize is called when the widget is destroyed. Implement to do special tear-down work.
        uninitialize: function () {
          logger.debug(this.id + ".uninitialize");
          this._unsubscribe();
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
                    this._eventHandles.push(this.connect(this.selectDropdownButton, "click", dojoLang.hitch(this,this._clickedDropdown)));
                    this._eventHandles.push(this.connect(this.selectDropdownButton, "keydown", dojoLang.hitch(this,this._buttonKeyDown)));

                    // set event to window for automatically closing the
                    this._eventHandles.push(this.connect(document, "click", dojoLang.hitch(this,function(event){
                        // if a widget external click is made: close the menu if open. first check though if the window click is not bubbled from this instance
                        if (!this._formGroupNode.contains(event.target)) {
                            var isOpenString = dojoAttr.get(this.selectDropdownButton,"aria-expanded")
                            if (isOpenString == "true") {
                                this._toggleDropdown(isOpenString);
                            }
                        }
                    })));

                    // set events to the listitems
                    dojoArray.forEach(this._newOptionDomArray, dojoLang.hitch(this, function(listItem){
                        var link = dojoTraverse(listItem).children()[0];
                        this._eventHandles.push(this.connect(link, "click", dojoLang.hitch(this, this._listItemClicked)));
                        this._eventHandles.push(this.connect(link, "keydown", dojoLang.hitch(this,this._optionLinkKeyDown)));
                    }));
                    break;
                case "default":
                default:
                    this._eventHandles.push(
                        this.connect(this._selectNode, "click", dojoLang.hitch(this, function(e){
                        
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
            console.log("just did the callback, so finished to loop");
        },

        // Rerender the interface.
        _updateRendering: function (callback) {
            switch(this.renderingMode) {
                case "full":
                    // move the custom widget dom
                    dojoConstruct.place(this.domNode,this._formGroupNode,1);

                    // if listitems allready exist: remove them.
                    if (this._newOptionDomArray && this._newOptionDomArray.length > 0 ) {
                        dojoArray.forEach(this._newOptionDomArray,dojoLang.hitch(this,function(optionDom) {
                            dojoConstruct.destroy(optionDom);
                        }));
                        this._newOptionDomArray = [];
                    }

                    // create the list items
                    dojoArray.forEach(this._optionArray,dojoLang.hitch(this, function(option){
                        this._createListItem(option, this.dropdownSelectorMenuNode); 
                    }));

                    // set the buttontext and styling
                    dojoAttr.set(this.selectValueFieldNode,'data-placeholder', this.placeholderText);
                    this._setSelectButton();

                    // hide the original select                         
                    //dojoAttr.set(this._selectNode,"style","display:none;");
                    var selectWrapper = dojoTraverse(this._selectNode).parent()[0];
                    dojoAttr.set(this._selectNode,"tabindex","-1");
                    dojoStyle.set(this._selectNode,"display","none");
                    break;
                case "default":
                default:
                    // destroy the template since we won't be using it
                    dojoConstruct.destroy(this.domNode);

                    // create the placeholder functionality in original option
                    if (this._optionDomArray[0]){
                        this._optionDomArray[0].innerHTML = this.placeholderText;
                    }
                    // adjust the button
                    this._setSelectButton();
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
            newLinkNode = dojoConstruct.create("a", {role:"option", "data-value":option.value, innerHTML: option.text, tabindex:"0"});
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

        _setSelectButton: function() {
            if (this._selectedIndex == 0) {
                // no item is selected - placeholder functionality
                this.selectValueFieldNode.textContent = dojoAttr.get(this.selectValueFieldNode,'data-placeholder');
                dojoClass.add(this.selectValueFieldNode,'placeholder');
            } else {
                // we have a selected item
                var selectedOption = this._optionArray[this._selectedIndex];
                this.selectValueFieldNode.textContent = selectedOption.text; 
                dojoClass.remove(this.selectValueFieldNode,'placeholder');
            }
        },

        _clickedDropdown: function(event) {
            console.log("clicked the dropdown");
            var isOpenString = dojoAttr.get(event.currentTarget,"aria-expanded");
            // toggle the menu
            this._toggleDropdown(isOpenString);
        },

        _buttonKeyDown: function(event) {
            // 40 = keydown, 38 = keyup, 13= enter, 27 = escape, 38|40|27|32
            var keyCode = event.which;
            switch (keyCode) {
                case 40:
                case 38:
                case 13:
                case 32:
                    event.stopPropagation();
                    event.preventDefault();
                    this._toggleDropdown("false");
                    break;
                default:
                    break;
            }
        },

        _optionLinkKeyDown: function(event) {
            event.stopPropagation();
            event.preventDefault();
            var keyCode = event.which;

            var listItem = dojoTraverse(event.currentTarget).parent()[0];
            var currentIndex = Number(dojoAttr.get(listItem,"data-original-index"));

            switch (keyCode) {
                case 40:
                    // keydown
                    if (currentIndex < (this._optionArray.length - 1)) {
                       this._setFocusOnListItem(currentIndex + 1);
                    }
                    break;
                case 38:
                    //key up
                    if (currentIndex > 0) {
                        this._setFocusOnListItem(currentIndex - 1);
                    }
                    break;
                case 13:
                case 32:
                    // enter or space
                    if (currentIndex != this._selectedIndex) {
                        this._setNewIndex(currentIndex);
                    }
                    this._toggleDropdown("true");
                    this._setFocusOnButton();
                    break;
                case 27:
                    // escape
                    this._setFocusOnButton();
                    this._toggleDropdown("true");
                    break;
                default:
                    break;
            }
        },

        _setFocusOnListItem: function(index) {
            var selectedListItem = this._newOptionDomArray[index];
            var newLink = selectedListItem.querySelector('a');
            // remove old focus
            document.activeElement.blur();
            // set new focus
            newLink.focus();
        },

        _setFocusOnButton: function() {
            document.activeElement.blur();
            this.selectDropdownButton.focus();
        },

        _toggleDropdown: function(isOpenString) {
            if (isOpenString == "false") {
                // closed menu - so open it up
                dojoClass.add(this.domNode, "open");
                dojoAttr.set(this.selectDropdownButton,"aria-expanded","true");
                this._setFocusOnListItem(this._selectedIndex);
            } else {
                // open menu - so close it
                dojoClass.remove(this.domNode, "open");
                dojoAttr.set(this.selectDropdownButton,"aria-expanded","false");
            }
        },

        _listItemClicked: function(event) {
            var listItem,
                newIndex;

            listItem = dojoTraverse(event.currentTarget).parent()[0];
            newIndex = Number(dojoAttr.get(listItem,"data-original-index"));
            if (newIndex != this._selectedIndex){
                this._setNewIndex(newIndex);
            }

            // close the actual dropdown as the window event isn't doing anything
            this._toggleDropdown("true");
        },

        _setNewIndex: function(newIndex) {
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
            this._setSelectButton();

            // adjust original select element NOTE TODO: if same value don't trigger event.
            this._selectNode.options.selectedIndex = this._selectedIndex;
            var newEvent = new Event('change');
            this._selectNode.dispatchEvent(newEvent);
        },

        _unsubscribe: function () {
          if (this._handles) {
              dojoArray.forEach(this._handles, dojoLang.hitch(this,function (handle) {
                  mx.data.unsubscribe(handle); 
                  //this._unsubscribe(handle);
              }));
              this._handles = [];
          }

          if ( this._eventHandles) {
              dojoArray.forEach( this._eventHandles, dojoLang.hitch(this, function( eventHandle){
                  this.disconnect(eventHandle);
              }));
               this._eventHandles = [];
          }

          /* type hier custom events bij */
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // Release handles on previous object, if any.
            this._unsubscribe();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                var objectHandle = mx.data.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function (guid) {
                        this.update(this._contextObj,function(){});
                    })
                });
                this._handles = [ objectHandle ];
            }
        }
    });
});

require(["DropdownSelector/widget/DropdownSelector"]);
