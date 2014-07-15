Vishwakarma Build System
=========
___

Vishwakarma Build System is built completely on top of Node JS. It is designed to be super fast and hassle-free..

Installation
--------------

```sh
git clone https://github.com/baliganikhil/vishwakarma.git
cd vishwakarma
npm install
npm start
```

Configuration
--------

You can configure Vishwakarma by editing the config.local file. The file is a simple JSON document where you can specify various ports and URLs.

There is also a config.default file that will be used to read default properties in case you have not specified any in the config.local

Getting Started
----------------

The first time you start with Vsihwakarma, (assuming default config) go to http://localhost:8080/bootstrap.html to create your administrator account. You can later move this file out of "public" folder to prevent further admin accounts from created directly

The home page (http://localhost:8080 by default) has a registration and sign in screen to sign in. Other users can register from this page. By default, they won't have any privileges. Administrator can add privileges by adding users to groups and adding project permissions to groups.


Docs
-----
Vishwakarma comes with documentation to help you manage everything from here on. (http://localhost:8080/docs.html)

Version
----
1.0

Bugs
----
The project is still under development and is getting refined. Please report any issues that you find and I will try to fix it as soon as possible. You are welcome to help improve the code too


License
----

MIT
