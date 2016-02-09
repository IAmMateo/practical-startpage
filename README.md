![logo]

## Practical Startpage
Chrome Extension that replaces the default newtab. Install from [Practical Startpage in chrome store]

### About
Startpage focuses on making your existing data available to you simple way.

Practical Startpage is for those that want a functional startpage, allowing easy access to chrome data, such as bookmarks and history.

Up now and on the next few months the intention is to improve the customization of the page, allowing changes to layout and styles. In the future there will be more widgets added that the users can have on their Practical Startpage.

The application is build flexibly, allowing anyone to contribute with a widget for the tabs.

### Contributions

The application is written in [AngularJS] with [Semantic UI] as the layout framework.
For the build [Gulp] is used. Please review [Angular Style Guide] and try to adhere where it makes sense. Further there are [ESLint] rules available in the project.

#### Widgets

Adding widgets should be fairly easy. Any self contained directive will run. All formatting variables are available from Services if needed, allowing consistent colors throughout.

#### Folder Structure

To keep each component easily identified, all files used by that component  must be grouped together with the same name or at least same prefix. In the case where components share parts with other components, such as services and templates these can be in a different location or have a different naming convention.

````
appdev/       - development Folder
  app/        - scripts
    core/     - core application
    services/ - services connecting to external
    widgets/  - widgets, directives, controller, and services
  dist/       - third party distributions
  img/        - images that are not specific to any part
dist/         - distribution that need adaptation

````
E.g. a mail checker would have the base logic and rendering code in * widgets/ * while the interfaces to outlook, Gmail and yahoo api would be under * services/ *

#### Configuration data

For the startpage to notice the widget it needs to be registered in * widgetConstants.js *

```javascript
[label of widget]: {
  title: "Title of Widget",
  icon: "icon classes from",
  directive: "widget directive without ps- prefix",
  help: "Help text",
  edit: {
    type: "type of edit widget, only support modal right now",
    url: "url to the html file",
  },
},
```

### Set-up development

#### Clone

* branch code and clone locally
* load the development folder to continuously monitor
  * in chrome to to Extensions ( * More toole -> Extensions * )
  * tick * [x] Developer mode*
  * _ Load unpacked extensions _ and select _ appdev/ _

#### Build

Install all dependencies
```
> npm install
```

Build code to * build/ *
```
> gulp build
```

[Practical Startpage in chrome store]: https://chrome.google.com/webstore/detail/ikjalccfdoghanieehppljppanjlmkcf
[AngularJS]: https://angularjs.org/
[Gulp]: http://gulpjs.com/
[Angular Style Guide]: https://github.com/johnpapa/angular-styleguide
[ESLint]: https://github.com/eslint/eslint
[logo]: ./appdev/img/icon48.png
