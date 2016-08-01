# GDG CHAT

## Requirements

- [NodeJS](https://nodejs.org/en/)
- [Git](https://git-scm.com/downloads)
- A Google Account


## Setup

In the terminal:
```
git clone https://github.com/gdg-galway/gdg-chat.git
cd gdg-chat
npm install
```

Start your local environment:
```
gulp
```


## 1. Create your Firebase Project

- Connect to the [Firebase Console](https://console.firebase.google.com)
- Create a new project
- Click on "Add Firebase to your web app"
![Firebase console](https://github.com/gdg-galway/gdg-chat/raw/master/app/assets/tutorial/firebase-console.jpg)
- Copy the second part of the snippet and paste it into `app/js/app.js`:

```javascript
var config = {
    apiKey: "AIzaSyAU4SXS_RPtoard35nJsIbUOfJUL75LG20",
    authDomain: "gdg-chat-9620b.firebaseapp.com",
    databaseURL: "https://gdg-chat-9620b.firebaseio.com",
    storageBucket: "gdg-chat-9620b.appspot.com",
};
firebase.initializeApp(config);
```

- Go to the Database section and into the Rules tab. We want all our users to be able to read the messages that have been posted, but they should be able to write into the database only once they are connected. Knowing that, let's change our rules and save:

```json
{
  "rules": {
    ".read": true,
    ".write": "auth != null"
  }
}
```

- Go to the Auth section and into the Sign-In Method tab. Let's enable the Google Authentication.
- Congratulations, your app is now connected to Firebase and your services are online!

## 2. User authentication

The authentication process is pretty simple to setup using Firebase. We enabled the authentication via Google previously and we will now add a method on our Log In button to go through the log in process. And same for our log out button once the user is connected. But first let's initialise our `auth` object.

```javascript
var auth = firebase.auth();
```

### Log In

We'll create our Google Authentication Provider, and then call the `signInWithPopup` method that will open a popup window to the Google Authentication page. This method returns a promise with the user object as parameter.

```javascript
connectBtn.addEventListener('click', googleAuth);

function googleAuth() {
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(function(result) {
        logIn(result.user);
    }).catch(function(error) {
        console.error(error);
    });
}
```

### Log Out

```javascript
logoutBtn.addEventListener('click', function() {
    auth.signOut().catch(function(error) {
        console.error(error);
    });
});
```

We will then use the `onAuthStateChanged` method to check when the user logs in or out.

```javascript
auth.onAuthStateChanged(function(user) {
    if (user) {
        // If the user object exists then we pass it to our logIn method/handler
        // This method should set our global user object, and handle all our DOM changes
        logIn(user);
    } else {
        // If the user object is null then it means that the user isn't connected (anymore)
        // Set the user object to null, and change our DOM to reflect the fact that user is not connected
        logOut();
    }
});
```

## 3. Save and retrieve messages

### Retrieve

Firebase uses an event-based system to notify the connected clients of any changes in the database.
The `child_added` event will be triggered everytime a new child object is added to `messages`. The event is called for each messages already available in the database, we will limit that to the last 100 messages.

```javascript
var ref_messages = firebase.database().ref('messages').limitToLast(100);
ref\_messages.on('child_added', function(value) {
    var message = value.val();
    appendMessage(message);
});

function appendMessage(message) {
    message.time = getDateFromTimestamp(message.timestamp);
    var item = document.createElement('div');
    item.classList.add('message');
    item.innerHTML = `
                        <div class="message-container">
                            <span class="time">${message.time.hours}:${message.time.minutes}</span>
                            <span class="username">${message.username}:</span>
                            <span class="content"></span>
                        </div>
                     `;
    var images = message.content.match(/(http|https)\:\/\/(.*)\.(jpg|jpeg|png|gif)(\S*)/g);
    // The Polyfill for linkify is provided in the app.js file. It simply transforms raw URLs into links.
    var content = message.content.linkify();
    // If the message contains an image we'll display it after the content.
    if (images) {
        content += `
                        <div class="image-container">
                            <a href="${images[0]}" target="_blank">
                                <img src="${images[0]}">
                            </a>
                        </div>
                    `;
    }
    item.querySelector('.content').innerHTML = content;
    messagebox.appendChild(item);
}

function getDateFromTimestamp(timestamp) {
    var date = new Date(timestamp);
    return {
        year: date.getFullYear(),
        month: zerofy(date.getMonth() + 1),
        day: zerofy(date.getDate()),
        hours: zerofy(date.getHours()),
        minutes: zerofy(date.getMinutes()),
        seconds: zerofy(date.getSeconds())
    };
}

function zerofy(n) {
    return n < 10 ? "0" + n : n;
}
```

### Save

So now that our users are connected they should be able to post new messages. Let's use the submit event of our form to post our message.
We will use the `push()` method of our `ref_messages` object to append our data to the `messages` object of our database.

```javascript
chatbox.addEventListener('submit', function(e) {
    e.preventDefault();
    // A couple of basic checks, we post the message if the user is connected, and if the content of the message is not empty.
    if (user && input.value.replace(/ |\n|\r/g, '').length > 0) {
        pushMessage(input.value);
    }
    input.value = "";
});

// This function formats our message and pushes it to our database.
function pushMessage(content) {
    var date = new Date();
    var message = {
        username: user.displayName,
        photoURL: user.photoURL,
        timestamp: date.getTime(),
        content: content
    };
    ref_messages.push(message);
}
```

## 4. Firebase Storage

On top of the Real Time Database, Authentication system, Firebase offers a Storage solution for your files and uploads. We'll use that service to add the possibility for our users to share pictures.

First, let's create our `storage` object and select a reference, we'll call it `photos`.

```javascript
var ref_storage = firebase.storage().ref('photos');
```

Now we will use the `change` event on our file input to push our file to the Storage API.

```javascript
file.addEventListener('change', function(e) {
    var f = e.target.files[0];
    if (f) {
        var ext = f.name.split('.');
        // Checks if the file extension is in our imageFormats array
        if (ext.length > 1 && imageFormats.indexOf(ext[ext.length - 1]) > -1) {
            // Checks if the file size is below 1Mb
            if (f.size < 1024 * 1024 * 1000) {
                // Creates the child reference for our file
                var photo = ref_storage.child(f.name);
                // Uploads the file
                var task = photo.put(f);
                // The state_changed event will be triggered once the file is uploaded and will return the URL of our file.
                task.on('state_changed', null, null, function() {
                    // We can then push this URL using our pushMessage method, it will then display the URL as a message and display the image.
                    if (task.snapshot.downloadURL) pushMessage(task.snapshot.downloadURL);
                });
            }
        }
    }
    e.target.value = "";
});

uploadBtn.addEventListener('click', function() {
    file.click();
});
```

## 5. Let's make it Progressive now!

In order to make our Web App Progressive we will have to make it work offline. To do that we will use the power of the Service Worker API.
To simplify this tutorial and your life in general, we will use the SW-Toolbox module.
But first let's take a look at our `manifest.json` file because it is important.

```json
{
    // Full name of your app
    "name": "GDGChat",
    // Shortened version that will be used on the splash screen
    "short_name": "GDGChat",
    // You don't need a lot of sizes really, two is fine, probably 32x32 and 192x192. But it's better if you have a lot of them so it looks great on every device.
    "icons": [{
        "src": "assets/app-icon-32.png",
        "sizes": "32x32",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-36.png",
        "sizes": "36x36",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-48.png",
        "sizes": "48x48",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-72.png",
        "sizes": "72x72",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-96.png",
        "sizes": "96x96",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-144.png",
        "sizes": "144x144",
        "type": "image/png"
    }, {
        "src": "assets/app-icon-192.png",
        "sizes": "192x192",
        "type": "image/png"
    }],
    // What page is loaded when the user presses the icon button on the Homescreen
    "start_url": "/",
    // Using standalone our web app will be displayed without out of your mobile browser so it'll look like a native app
    "display": "standalone",
    // The background color of your splash screen
    "background_color": "#ffffff",
    // The color of your theme that will be used to color the nav bar of your browser
    "theme_color": "#ea2c3c"
}
```

We can open our `service-worker.js` file, and add the following:

```javascript
// Imports the sw-toolbox module
importScripts('./node_modules/sw-toolbox/sw-toolbox.js');

// The list of files that we have to precache to make our app work offline
toolbox.precache(['/', '/js/firebase.min.js', '/js/app.js', '/assets/app-icon-192.png', '/manifest.json']);

// Choose the strategy to apply for each file
// 'Fastest' races the cache vs. the network, the fastest will be used, but the network version of the file will be cached for next time.
toolbox.router.get('/', toolbox.fastest);
toolbox.router.get('/js/firebase.min.js', toolbox.fastest);
toolbox.router.get('/js/app.js', toolbox.fastest);
toolbox.router.get('/manifest.json', toolbox.fastest);
toolbox.router.get('/assets/app-icon-192.png', toolbox.fastest);
```

Now that our Service Worker file is ready, let's register our Service Worker in the HEAD of our `index.html` file.

```html
<script>
    // Checks if the serviceWorker API is available
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', function() {
            // Register our service worker
            navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
        });
    }
</script>
```

Congratulations! Your app will now work offline once the required files are cached.

# 6. Improve our app

Firebase is awesome... If you're not connected, it will remember that you were connected at some point, so the user will be allowed to post messages.
The messages that the user will post offline will be sent once he comes back online. Same thing when the user tries to upload a file.
But if you load the app offline you won't see the messages because Firebase couldn't retrieve them.
Let's improve that by caching our messages ourselves using the LocalStorage API.

Now we'll display the cached messages when the app is loaded. But there's a problem: when the user will connect to the database the same messages will be pulled from Firebase and displayed twice. To avoid that we will order the results coming from the database by key, and we will ask Firebase to return the results starting at the latest known key contained in our cache. If nothing is cached, we'll still load the last 100 results available in our Firebase database. We'll then go back to our `child_added` event, and add some code.

```javascript
var ref_messages = firebase.database().ref('messages');
var ref_messages_filtered = ref_messages.limitToLast(100);

initLocal();

function initLocal() {
    // Checks if LocalStorage is available, and if something is cached
    if (localStorage && localStorage['gdg_chat_messages']) {
        try {
            var m = JSON.parse(localStorage['gdg_chat_messages']);
            if (Array.isArray(m)) messages = m;
        } catch (e) {
            console.error('Wrong format used in local storage', e);
            localStorage.removeItem('gdg_chat_messages');
        }
        // Checks if messages isn't empty
        if (messages.length > 0) {
            // We append all the cached messages
            messages.forEach(function(o, i) {
                appendMessage(o.message);
            });
            // We set our startingKey as the last key available in our cached messages
            startingKey = messages[messages.length - 1].key;
            // The messages retrieved by the Firebase API will start from the last result the user cached
            ref_messages_filtered = ref_messages.orderByKey().startAt(startingKey);
        }
    }
}

// ref_messages_filtered is .orderByKey().startAt(startingKey) if something is cached, or .limitToLast(100) if not.
ref_messages_filtered.on('child_added', function(value) {
    // Firebase loads the first result of our query, but we already displayed it since it is the last item in our cached database
    if (value.key === startingKey) return;
    var message = value.val();
    appendMessage(message);
    // Pushes the message to our 'messages' array
    messages.push({ key: value.key, message: message });
    // We're only caching the last 100 messages
    if (messages.length > 100) messages = messages.slice(messages.length - 100);
    // If the localStorage API is available we stringify and cache the content of 'messages'
    if (localStorage) localStorage.setItem('gdg_chat_messages', JSON.stringify(messages));
});
```

## 7. Go live with Firebase hosting in minutes!

We're going to use the `firebase-tools` package to initialise and deploy our app on the free HTTPS subdomain offered by Firebase.
To do so, let'go to our terminal and use the `firebase init` command. It'll guide you through a quick setup, don't forget to set your app path to the "/app" folder.
And now use the command `firebase deploy` to deploy your app.
Once the app is deployed the terminal will return the url of your app.

Great! Your Progressive Web App is live.

## Conclusion

We have used the 4 key services of Firebase: Authentication, Real Time Database, Storage, and Hosting. I invite you to look at the [Guides and API References](https://firebase.google.com/docs/) to learn more about Firebase.
Your users are now able to connect to your app and retrieve/send messages, and pictures. These functionalities are available online AND offline.
Most mobile browsers will ask your users if they want to add your web app to their Homescreen, so your app will be easily accessible.

This is a Progressive Web App.

## Even more features

We couldn't talk about push notifications in this tutorial because it requires more time and explanations but it is one of the key features of a Progressive Web App.
Using push notifications you can alert your users both on desktop and mobile even if they're not looking at your web app by sending a notification. This notification can be customised: text only, image and text, buttons with special events, ...
But to use push notifications you definitly need a server-side to send these notifications. The setup isn't the easiest thing in the world as well so we shall talk about it in another tutorial.




Thank you!