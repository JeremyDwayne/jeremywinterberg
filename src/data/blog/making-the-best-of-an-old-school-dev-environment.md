---
title: Making the Best of an Old School Dev Environment
pubDate: '2021-02-26'
tags: ["Dev Environment"]
draft: false
---
![black Fayorit typewriter with printer paper](../../assets/blog/making-the-best-of-an-old-school-dev-environment/a470770cf29b.jpg)

## No Local Dev Environment??

At the company I (used to) work at, we write code off our remote server without setting up a local environment. Finding the best remote dev environment has been a journey for me. The extension FTP Simple has worked well so far, but it has some draw backs.

You need to verify that the new version of the file downloaded off the server, and when you save that it actually uploaded. Otherwise you might overwrite something accidentally. It can be a little slow if its downloading a large file Sometimes if you refresh the browser faster than the file saved you’ll get a fatal error

### What’s the solution?

Running VS Code through Remote SSH. This setup allows you to use tools that require the full scope of the project’s files.

You can now access all of the Git tools/extensions vs code has instead of doing it through the web interface. Robust extensions like PHP Intelephense work completely. We can start writing and running automated testing suites with tools like phpunit/selenium etc.. The biggest takeaway that I got from this switch, is that it feels like I’m working in a local dev environment again. Which makes me very happy. The following guide was written for my co-workers, but I decided to strip out specifics to share on the blog.

#### Required Extensions:

Name: Remote – SSH

Description: Open any folder on a remote machine using SSH and take advantage of VS Code’s full feature set. VS Marketplace Link: <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh> Name: Remote – SSH: Editing Configuration Files

Description: Edit SSH configuration files VS Marketplace Link: <https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh-edit> Recommended Extensions For PHP Testing:

Ignore if you don’t write php

Name: PHPUnit

Description: Run PHPUnit tests from VSCode. VS Marketplace Link: <https://marketplace.visualstudio.com/items?itemName=emallin.phpunit> Name: PHPUnit Watcher

Description: Run PHPUnit on file changes VS Marketplace Link: <https://marketplace.visualstudio.com/items?itemName=HerisIT.phpunit-watcher>

## Steps for Setup

1. Generate an SSH Key on your local machine.

- Follow the steps there for checking existing keys, generating a new key, adding it to the SSH Agent, and copying it to github.

- <https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh>

2. Add the SSH Key to the server.

- You should have an account on the server, if you aren’t sure, speak to your server administrator.

  - The FTP account used in FTP-Simple should work for ssh as well

  - However, currently you probably only have password access. You will need that password!

- run the command ssh-copy-id @

  - This will prompt you for your password, enter it.

- You should be able to SSH to the server without a password now!

  - test this by doing ssh @, if it doesn’t prompt for a password you’re set.

3. In VS Code, with the Remote SSH extension installed, bring up your command pallette (ctrl/cmd + shift + p)

- type in Remote-SSH and open configuration file, this should be at \~/.ssh/config or somewhere similar

- enter the following config, replacing the values with your own.

```
Host <devsite>
User <ssh account>
HostName <devsite url>
Port 22
```

4. In VS Code, with the Remote SSH extension installed, bring up your command pallette (ctrl/cmd + shift + p)

- This time you’re going to type Remote-SSH and select connect to host

- Select the Host you created in the ssh config

5. You should now be connecting to the server over SSH.

6. Extensions may need to be reinstalled on the SSH host, I know I did

- I believe its due to them installing various dependencies to run.

7. I also recommend opening your remote project directory, then saving the workspace locally on your computer. Then when you open vs code you can instantly go to that folder on the server in the future with ease.

- Saving on the server was causing me issues.

## Conclusion

I hope this helps someone get away from the clutches of FTP! I’ve been struggling with how to work remotely ever since I joined my company almost 2 years ago. This is finally the best dev environment I’ve come up with and am happy about. It feels like I’m working locally again!

I’m sure this guide will need many tweaks and adjustments. If you have an issues, feel free to reach out for help. If you’re not a co-worker, join the discord server, DM on twitter, or email me through the contact form and I’ll try to help. I wrote this largely off memory of what I did, and I’m sure I missed a few things.

Always strive to make your development environment work for you, and make your life more convenient. If you ever catch yourself frustrated, think about how to solve it. Don’t push it off because you don’t have time to look into it.

## Commands to run on the server

_These commands are really just for my coworkers. We write a web application in PHP._

- add to \~/.bashrc for global composer installations to work as commands

  - Only really needed if you want to run phpunit-watcher in the terminal vs the vs code extension

```
export PATH="$PATH:$HOME/.config/composer/vendor/bin"
```

You will need to install php-cs-fixer to format your php code

```
composer global require friendsofphp/php-cs-fixer
```

Additionally you will need the following vs code settings to point to your executablePath

```
"php-cs-fixer.executablePath": "/home/<account>/.config/composer/vendor/bin/php-cs-fixer",
"php-cs-fixer.config": "/sc/config/.php_cs",
"beautify.config": "/sc/config/.jsbeautifyrc",
```

[Subscribe now](https://www.jeremywinterberg.com/subscribe?)

[Share](https://www.jeremywinterberg.com/p/making-the-best-of-an-old-school-dev-environment?utm_source=substack\&utm_medium=email\&utm_content=share\&action=share)
