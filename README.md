# DropdownSelector widget

Enhancement of the standard html form dropdown element for usability and UX purposes.

## Contributing

For more information on contributing to this repository visit [Contributing to a GitHub repository](https://world.mendix.com/display/howto50/Contributing+to+a+GitHub+repository)!

## Description

The widget adds a placeholder functionality as well as the creation of a stylable version of a dropdown selector and it's elements. This stylable version uses Bootstrap compatible markup and styling and is easily adjusted to the desired result. It is meant as an extension of the native Mendix dropdown selector elements such as reference selectors. Meaning you can still use all the normal, native options of the Mendix widget.

## Features

1. Placeholder text functionality (standalone as well).
2. Replacing the original select form field with a custom Bootstrap compatible one.
3. Possibility for automatic dropup detection.
4. Possibility for automatic height calculation and resizing of the dropdown menu.
5. Possibility for fixed positioning of the menu (which can be used if advanced scroll container layouts are problematic).
6. Supports dynamic changing between editable and non-editable versions of the widget.
6. Has keyboard compatibility whilst using the dropdown.
7. Option to automatically disable the creation of a stylable version on mobile and tablet devices.
8. Uses all the normal functionality the original Mendix selector element has.

## Implementation steps

1. Place the custom widget under the native Mendix dropdown widget such as a reference selector.
2. Provide a logical name to the original native widget and copy that name into the settings of the custom widget under target.
3. Change the widget settings to accomodate for the wanted behaviour / appearance.
4. Add styling to the theme to make any further adjustments

## Notes
Due to some differences in html markup, the widget doesn't work well with label-less input fields. If used without label but with enable disable editability: make sure to use an empty label.

## Release Notes
Appstore 1.2 release:
- fixed horizontal form bug with incorrect width of form elements.
- fixed bug that caused infinite loop on reloading the same page or when using snippets.
- fixed bug in which a disabled field could no longer be clickable after becoming enabled again.

Appstore 1.1 release:
- fixed issue with delays in original dropdown being filled with data
- added observers to cope with external changes to the original element that don't trigger an update view event
- added observer support for IE10

Appstore 1.0 release:
- first version of the widget

## More information