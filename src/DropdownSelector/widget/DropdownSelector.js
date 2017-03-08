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
        useFixedPositioning: null,
        disableDropUp: null,
        disableResizing: null,

        // Internal variables. Non-primitives created in the prototype are shared between all widget instances.
        _eventHandles: null,
        _contextObj: null,
        _targetNameNode: null,
        _selectNode: null,
        _selectNodeContainer: null,
        _formGroupNode:null,
        _optionDomArray: null,
        _optionArray: null,
        _newOptionDomArray: null,
        _selectedIndex: null,
        _controlLabelUsed: null,
        _controlLabelNode: null,
        _horizontalForm: null,
        _dropUp:null,
        _menuHeight:null,
        _windowScrollListener:null,
        _scrollContainerListener:null,
        _scrollContainerObject:null,

        // dojo.declare.constructor is called to construct the widget instance. Implement to initialize non-primitive properties.
        constructor: function () {
            logger.debug(this.id + ".constructor");
            this._eventHandles = [];
            this._optionDomArray = [];
            this._optionArray = [];
            this._newOptionDomArray = [];
            this._controlLabelUsed = true;
            this._horizontalForm = false;
            this._dropUp = false;
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

            // find all nodes TODO: cleanup
            this._targetNameNode = dojoQuery(this.targetName);
            this._targetNameNode = this._targetNameNode[0];
            this._formGroupNode = this._targetNameNode;
            if (this._formGroupNode) {
                this._selectNode = dojoQuery('select',this._formGroupNode)[0];
                // locate control - label
                var labels = dojoQuery(".control-label",this._formGroupNode);
                if (labels.length === 0) {                
                    this._controlLabelUsed = false; 
                } else {
                    this._controlLabelUsed = true;
                    this._controlLabelNode = labels[0];

                    // if a label is present we can detect if it is vertical - note horizontal only enabled when label is present
                    var classString = dojoAttr.get(this._controlLabelNode,"class");
                    if (classString.indexOf("col-sm") !== -1) {
                        this._horizontalForm = true;
                    } else {
                        this._horizontalForm = false;
                    }
                }
            } else {
                logger.debug("there was no Mendix widget found with the specified target name");
                // destroy the template since something went wrong
                dojoConstruct.destroy(this.domNode);
                callback();
                return;
            }
            if (this._selectNode) {
                // set parent container - note: for some reason normal parent or parentNode doesn't work
                this._selectNodeContainer = dojoTraverse(this._selectNode).parents("div")[0];
                if (this._horizontalForm) {
                    var horizontalInputWidth = this._retrieveInputWidth(this._selectNodeContainer);
                    dojoClass.add(this.domNode, horizontalInputWidth);
                }

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
                // destroy the template since something went wrong
                dojoConstruct.destroy(this.domNode);
                callback();
                return;
            }
            this._resetSubscriptions();
            this._updateRendering(callback);
        },

        // mxui.widget._WidgetBase.enable is called when the widget should enable editing. Implement to enable editing if widget is input widget.
        enable: function () {
            console.log("want to enable editing");
            logger.debug(this.id + ".enable");
            switch(this.renderingMode){
                case "full":
                    // reset the styling and button. Note that the update function will be triggered after this.
                    // add and move the button once more
                    this.domNode.appendChild(this.selectDropdownButton);
                    dojoConstruct.place(this.selectDropdownButton,this.domNode,0);
                    dojoStyle.set(this.domNode,"display","");
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
                    // get rid of the eventHandles
                    this._unsubscribe();

                    // get rid of list elements and hide the domNode (we need to keep it as we still want the events)
                    dojoArray.forEach(this._newOptionDomArray, dojoLang.hitch(this,function(optionDom) {
                        dojoConstruct.destroy(optionDom);
                    }));
                    this._newOptionDomArray = [];
                    dojoStyle.set(this.domNode,"display","none");
                    // remove button but keep it in memory
                    this.domNode.removeChild(this.selectDropdownButton);
                    break;
                case "default":
                default:
                    // do nothing, only relevant for versions where we replaced the input
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
                            // kan hier ook weggooien.
                        }));
                        this._newOptionDomArray = [];
                    }

                    // create the list items
                    dojoArray.forEach(this._optionArray,dojoLang.hitch(this, function(option){
                        this._createListItem(option, this.dropdownSelectorMenuNode); 
                    }));

                    // get the original menu height
                    dojoStyle.set(this.dropdownSelectorMenuNode,"display","block");
                    this._menuHeight = this.dropdownSelectorMenuNode.offsetHeight;
                    dojoStyle.set(this.dropdownSelectorMenuNode,"display","");

                    // set the buttontext and styling
                    dojoAttr.set(this.selectValueFieldNode,'data-placeholder', this.placeholderText);
                    this._setSelectButton();

                    // hide the original select                         
                    dojoAttr.set(this._selectNode,"tabindex","-1"); 
                    dojoStyle.set(this._selectNode,"display","none");
                    break;
                case "default":
                default:
                    // destroy the template since we won't be using it
                    dojoConstruct.destroy(this.domNode);

                    // add a classname on the formgroup
                    dojoClass.add(this._formGroupNode,"extended-dropdown-selector");

                    // create the placeholder functionality in original option
                    if (this._optionDomArray[0]){
                        this._optionDomArray[0].innerHTML = this.placeholderText;
                    }
                    // adjust the button
                    if (this._selectedIndex !== 0) {
                        dojoClass.add(this._selectNode, "option-selected");
                    } else {
                        dojoClass.remove(this._selectNode, "option-selected");
                    }
                    break;
            }
            
            logger.debug(this.id + "._updateRendering");

            this._setupEvents(callback);  
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

                    // if label is present we need to make sure that clicking on it will close it as well
                    if (this._controlLabelUsed){
                        this._eventHandles.push(this.connect(this._controlLabelNode, "click", dojoLang.hitch(this,this._clickedControlLabel)));
                    }

                    // set event to window for automatically closing the
                    this._eventHandles.push(this.connect(document, "click", dojoLang.hitch(this,function(event){
                        // if a widget external click is made: close the menu if open. first check though if the window click is not bubbled from this instance
                        //if (!this._selectNodeContainer.contains(event.target)){
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

                    if (this.useFixedPositioning) {
                        console.log("Using fixed positioning and adding windowscroll listener")
                        this._windowScrollListener = window.addEventListener("scroll",dojoLang.hitch(this,this._windowScrolled), true);
                    }

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
            
            // The callback, coming from update, needs to be executed, to let the page know it finished rendering
            mendix.lang.nullExec(callback);
            console.log("just did the callback, so finished to loop");
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

        _clickedControlLabel: function(event) {
            var isOpenString = dojoAttr.get(this.selectDropdownButton,"aria-expanded");
            if (isOpenString === "true") {
                this._toggleDropdown(isOpenString);
            }
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
                if (!this.disableResizing || !this.disableDropUp || this.useFixedPositioning) {
                    this._defineDropMenu();
                }
                this._setFocusOnListItem(this._selectedIndex);
                
            } else {
                // open menu - so close it
                dojoClass.remove(this.domNode, "open");
                dojoAttr.set(this.selectDropdownButton,"aria-expanded","false");

                if (this.useFixedPositioning) {
                    dojoAttr.set(this.dropdownSelectorMenuNode,"style","");
                    // set back to original location for calculation reusage
                    dojoConstruct.place(this.dropdownSelectorMenuNode,this.domNode,"last"); 
                }
            }
        },

        _defineDropMenu: function() {
            var maxHeight = window.innerHeight;
            var buttonPosition = this.selectDropdownButton.getBoundingClientRect();
            var yCoord = buttonPosition.top;
            var margin = 15;
            var menuMaxHeight;
            var newTop;

            if (!this.disableDropUp) {
                if ((yCoord/maxHeight) > 0.65) {
                    this._dropUp = true;
                    dojoClass.add(this.domNode,"dropup");

                    //menuMaxHeight = maxHeight - margin - yCoord;
                    menuMaxHeight = buttonPosition.top - margin;
                } else {
                    this._dropUp = false;
                    dojoClass.remove(this.domNode,"dropup");

                    //menuMaxHeight = buttonPosition.bottom - margin - this.selectDropdownButton.offsetHeight;
                    menuMaxHeight = maxHeight - margin - yCoord - this.selectDropdownButton.offsetHeight;

                }
            } else {
                //menuMaxHeight = buttonPosition.bottom - margin - this.selectDropdownButton.offsetHeight;
                menuMaxHeight = maxHeight - margin - yCoord - this.selectDropdownButton.offsetHeight;
            }

            if (!this.disableResizing) {
                if (menuMaxHeight < this._menuHeight) {
                    var newHeight = menuMaxHeight.toString() + "px";
                    dojoStyle.set(this.dropdownSelectorMenuNode, "max-height", newHeight);
                } else {
                    dojoStyle.set(this.dropdownSelectorMenuNode, "max-height", "");
                }
            }
            if (this.useFixedPositioning) {
                
                if (this._dropUp) {
                    newTop = buttonPosition.top - this.dropdownSelectorMenuNode.offsetHeight;
                } else {
                    newTop = buttonPosition.top + this.selectDropdownButton.offsetHeight;
                }
                //this._determineFixedPositioningTEST(buttonPosition, menuMaxHeight);
                this._determineFixedPositioning(buttonPosition, newTop);      
            }
        },

        _determineFixedPositioning: function(windowBox, newTop) {
            var width = this.dropdownSelectorMenuNode.offsetWidth;
            var height = this.dropdownSelectorMenuNode.offsetHeight;
            var left = windowBox.left;
            var top = newTop.toString() + "px";
            width = width.toString() + "px";
            height = height.toString() + "px";
            left = left.toString() + "px";
            dojoStyle.set(this.dropdownSelectorMenuNode,"overflow","auto");
            dojoStyle.set(this.dropdownSelectorMenuNode,"width",width); 
            dojoStyle.set(this.dropdownSelectorMenuNode,"height",height);
            dojoStyle.set(this.dropdownSelectorMenuNode,"left",left);
            dojoStyle.set(this.dropdownSelectorMenuNode,"top",top); 
            dojoStyle.set(this.dropdownSelectorMenuNode,"display","block");
            dojoStyle.set(this.dropdownSelectorMenuNode,"margin",0);
            var pageDom = dojoQuery('div.mx-page')[0];
            dojoConstruct.place(this.dropdownSelectorMenuNode,pageDom,"last");
            console.log(pageDom);


            // set event listener 
            if (!this._scrollContainerListener) { 
                console.log("trying to set a scrollcontainerlistener");
                this._scrollContainerObject = dojoTraverse(this.domNode).parents('.mx-scrollcontainer')[0];
                var temp = this._scrollContainerObject;
                console.log(this._scrollContainerObject);
                this._scrollContainerListener = this._scrollContainerObject.addEventListener("scroll",dojoLang.hitch(this,this._windowScrolled));
            }
        },

        _determineFixedPositioningTEST: function(windowBox,menuMaxHeight) {
            var margin = 15;
            var fixNonResizeHeightTop = false;
            var fixNonResizeHeightBottom = false;

            if (windowBox === null || windowBox === undefined) {
                console.log("just had null as windowbox creating new one");
                windowBox = this.selectDropdownButton.getBoundingClientRect();
            }
            var maxHeight = window.innerHeight; 
            if (menuMaxHeight === null || menuMaxHeight === undefined) {
                if (this._dropUp) {
                    menuMaxHeight = windowBox.top - margin; 
                } else {
                    menuMaxHeight = maxHeight - margin - windowBox.top - this.selectDropdownButton.offsetHeight;
                }
            }

            var left = windowBox.left;
            var right = window.innerWidth - (windowBox.left + this.selectDropdownButton.offsetWidth);
            var top = windowBox.top + this.selectDropdownButton.offsetHeight;
            var bottom = maxHeight - top - this._menuHeight;

            this._dropUp = true;

            if (this._dropUp) {
                bottom = maxHeight - windowBox.top;
                top = windowBox.top - this._menuHeight;
                if (this._menuHeight > menuMaxHeight) {
                    top = windowBox.top - menuMaxHeight;
                }
            } else {
                if (this._menuHeight > menuMaxHeight) {
                    bottom = maxHeight - top - menuMaxHeight;
                }
            }

            console.log("testing bottom: " + bottom + "   / top: " + windowBox.top);

            // set the styles
            left = left.toString() + "px";
            right = right.toString() + "px";
            top = top.toString() + "px";
            bottom = bottom.toString() + "px";

            dojoStyle.set(this.dropdownSelectorMenuNode,"position", "fixed");
            dojoStyle.set(this.dropdownSelectorMenuNode,"float", "none");
            dojoStyle.set(this.dropdownSelectorMenuNode,"width", "auto");
            dojoStyle.set(this.dropdownSelectorMenuNode,"left", left);
            dojoStyle.set(this.dropdownSelectorMenuNode,"right", right);
            dojoStyle.set(this.dropdownSelectorMenuNode,"top", top);
            dojoStyle.set(this.dropdownSelectorMenuNode,"bottom", bottom);

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

        _retrieveInputWidth: function(node) {
            return dojoAttr.get(node,"class");
        },

        _windowScrolled:function(event) {
            console.log("scrolled: " + event);
        },

        _unsubscribe: function () {
          if ( this._eventHandles) {
              dojoArray.forEach( this._eventHandles, dojoLang.hitch(this, function( eventHandle){
                  this.disconnect(eventHandle);
              }));
               this._eventHandles = [];
          }

          if (this.useFixedPositioning) {
              if (this._windowScrollListener){
                    this._windowScrollListener = window.removeEventListener("scroll",dojoLang.hitch(this,this._windowScrolled));
              }
              if (this._scrollContainerListener) {
                 this._scrollContainerListener = this._scrollContainerObject.removeEventListener("scroll",dojoLang.hitch(this,this._windowScrolled));
              }
            }  

          /* type hier custom events bij */
        },

        // Reset subscriptions.
        _resetSubscriptions: function () {
            logger.debug(this.id + "._resetSubscriptions");
            // get rid of all events on elements
            this._unsubscribe();
            // Release handles on previous object, if any.
            this.unsubscribeAll();

            // When a mendix object exists create subscribtions.
            if (this._contextObj) {
                this.subscribe({
                    guid: this._contextObj.getGuid(),
                    callback: dojoLang.hitch(this, function(guid){
                        this.update(this._contextObj,function(){});
                    })

                })
            }
        }
    });
});

require(["DropdownSelector/widget/DropdownSelector"]);
