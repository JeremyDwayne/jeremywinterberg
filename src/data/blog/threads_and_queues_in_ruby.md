---
title: Threads And Queues In Ruby
description: >-
  Should your code be written with threads, or should you rely on asynchronous
  job execution systems like Sidekiq?
pubDate: '2023-01-03'
tags: ["Ruby"]
draft: false
---
![three men sitting while using laptops and watching man beside whiteboard](../../assets/blog/threads_and_queues_in_ruby/62d1a367fe58.png)

## Technical Interviews Are Hard

I recently tried solving a coding challenge that required concurrent processing of data. This is something I’ve honestly never done before in code. At work, almost everything is event driven, and tasks that do need to be done asynchronously or concurrently have been done through systems like Sidekiq, Redis or message queues like Kafka.

I want to introduce the problem to you, go over my solution, and describe my thought process along the way.. as best I can. I’m in no way trying to even claim I solved the problem correctly, or used Threads and Queues in the way they’re intended. What I can do, however, is document what I did and continue to learn and grow from here.

I found this to be incredibly engaging for me, because it was a new concept that I hadn’t attempted to write code for before.

## The Problem

A user’s identity is flagged, and they must meet with a support rep to validate they are who they say they are. Design a system that ingests the users, assigns a support rep to the case, and validates their identity.

### Requirements

1. A new user will be added to the queue every 2 seconds

2. An identity will be verified after 4 seconds

3. A support rep can only work on one validation at a time.

### Expected Output

1. `User <ID> has been verified and removed from the queue`

2. Metrics to demonstrate the progress of the queue.

### Provided data

```
users = [
 { id: 1 },
 { id: 2 },
 { id: 3 },
 { id: 4 },
 { id: 5 },
 { id: 6 },
 { id: 7 },
 { id: 8 },
 { id: 9 },
 { id: 10 }
]

support_reps = [
 { id: 1 },
 { id: 2 },
 { id: 3 },
 { id: 4 }
]
```

## The Attempted Solution

Since we’re building out a queue data structure, we can use the Queue class that Ruby provides. The alternative approach, and what I used initially, is to use an array as a basic queue.

Something like this technically works, but is a basic approach and isn’t as straightforward to process in parallel.

```
users = []
users.push({ id: 1})
users.shift
```

Once I remembered there actually is a standard Queue class, I noticed that it intrinsically supports Threads. Threads are how I plan on processing multiple users simultaneously.

```
class VerificationQueue
 attr_reader :users, :support_reps

 def initialize
 @users = Queue.new
 @support_reps = []
 end

 def verify_users
 workers = support_reps.size.times.map do
 Thread.new do
 begin
 while user = users.pop
 support_rep = available_support_rep
 if support_rep && user
 support_rep.update_status('busy')
 session = VerificationSession.new(user, support_rep)
 self.to_s
 until(session.verified?)
 end
 support_rep.update_status('available')
 puts "User #{user[:id]} has been verified and removed from the queue"
 puts session.to_s
 end
 end
 rescue ThreadError
 end
 end
 end

 workers.map(&:join)
 end

 def available_support_rep
 support_reps.each do |ref|
 next if ref.status == 'busy'
 return ref
 end
 end

 def add_user(user)
 users.push(user)
 puts "User #{user[:id]} added to the queue."
 end

 def add_support_rep(support_rep)
 support_reps.push(support_rep)
 puts "support_rep #{support_rep.id} has started working."
 end

 def to_s
 puts "==== Queue Status ===="
 puts "Users still in queue: #{users.size}"
 puts "support_reps"
 puts support_reps
 puts "======================"
end
```

I spin up a new thread for each support rep, so the code can verify the users simultaneously. When each support rep becomes available again, it picks up the next user in the queue.

The algorithm I used to select an available support rep isn’t elegant. It just loops through the reps and chooses the next available. If I really cared about work-life balance I would implement some sort of weighted priority system that could determine how much work each rep had taken on recently.

The verification process is managed through a VerificationSession. Due to the simplicity of the challenge, it just tracks the time elapsed and completes after 4 seconds. In a real implementation you would trigger whatever logic would be necessary to verify the identity of a user.

```
class VerificationSession
 TIME_COMPLETED = 4.0

 attr_reader :user, :support_rep, :start_time

 def initialize(user, support_rep)
 @user = user
 @support_rep = support_rep
 @start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
 end

 def elapsed_time
 end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
 end_time - start_time
 end

 def verified?
 elapsed_time >= TIME_COMPLETED
 end

 def to_s
 "VerificationSession: User: #{user[:id]} Rep: #{support_rep} Elapsed: #{elapsed_time.round(4)}"
 end
end
```

There’s a couple of approaches we can take to build out our SupportRep objects. The first that came to mind was creating a class which would allow future expansion of functionality. The more simplistic route would be to create a Struct. What I struggle with in these coding challenges is the trade-offs between expressing good design and keeping the solution short and sweet.

So first is the more traditional class route that I actually wrote, followed by how I think I would approach this in the future with a Struct.

```
class SupportRep
 attr_reader :id, :status

 def initialize(id, status = 'available')
 @id = id
 @status = status
 end

 def update_status(status)
 @status = status
 end

 def to_s
 "id: #{id}, status: #{status}"
 end
end
```

Here’s an example of how I might do it with a Struct.

```
SupportRep = Struct.new(:id, :status)

queue = VerificationQueue.new

for id in 1..4 do
 support_rep = SupportRep.new(id, 'available')
 queue.add_support_rep(support_rep)
end

# Then when I need to change the status I could just do
support_rep.status = 'busy'
```

Exploring the alternate Struct method is for another time. For now let’s try to run it with the code as is using classes.

### Let’s Try To Run It!

Here is some simple code to build up the data we need to run this. In order to simulate a new user being added every 2 seconds, I also am using threads to start the validation queue and then add users to it.

```
users = [
 { id: 1 },
 { id: 2 },
 { id: 3 },
 { id: 4 },
 { id: 5 },
 { id: 6 },
 { id: 7 },
 { id: 8 },
 { id: 9 },
 { id: 10 }
]

support_reps = [
 { id: 1 },
 { id: 2 },
 { id: 3 },
 { id: 4 }
]

start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
queue = VerificationQueue.new

support_reps.map do |ref|
 support_rep = SupportRep.new(ref[:id])
 queue.add_support_rep(support_rep)
end

threads = []

queue.add_user(users.shift)

threads << Thread.new do
 begin
 queue.verify_users
 rescue ThreadError
 end
end

threads << Thread.new do
 begin
 while user = users.shift
 start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
 until(elapsed_time(start_time) >= 2.0)
 end
 queue.add_user(user)
 end
 rescue ThreadError
 end
end

threads.map { |thread| thread.join(10) }
queue.to_s


def elapsed_time(start_time)
 end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC)
 end_time - start_time
end
puts "/nElapsed Time: #{elapsed_time(start_time).round(4)}"
```

The output is a bit messy, but you can get the gist of it. It processes 10 users in 19 seconds, each user taking 4 seconds. Without using threads, this would’ve taken a minimum of 40 seconds. Add more support reps and it takes even less time.

```
❯ ruby threads.rb
support_rep 1 has started working.
support_rep 2 has started working.
support_rep 3 has started working.
support_rep 4 has started working.
User 1 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: available
id: 3, status: available
id: 4, status: available
======================
User 2 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 1 has been verified and removed from the queue
VerificationSession: User: 1 Rep: id: 1, status: available Elapsed: 4.0
User 3 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 4 added to the queue.
User 2 has been verified and removed from the queue
VerificationSession: User: 2 Rep: id: 2, status: available Elapsed: 4.0
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 5 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 3 has been verified and removed from the queue
VerificationSession: User: 3 Rep: id: 1, status: busy Elapsed: 4.6134
User 4 has been verified and removed from the queue
VerificationSession: User: 4 Rep: id: 2, status: busy Elapsed: 4.289
User 6 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 5 has been verified and removed from the queue
VerificationSession: User: 5 Rep: id: 1, status: available Elapsed: 4.2006
User 7 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 6 has been verified and removed from the queue
VerificationSession: User: 6 Rep: id: 2, status: available Elapsed: 4.0884
User 8 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 7 has been verified and removed from the queue
VerificationSession: User: 7 Rep: id: 1, status: available Elapsed: 4.0001
User 9 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
User 8 has been verified and removed from the queue
VerificationSession: User: 8 Rep: id: 2, status: available Elapsed: 4.0943
User 10 added to the queue.
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
==== Queue Status ====
Users still in queue: 0
support_reps
id: 1, status: busy
id: 2, status: busy
id: 3, status: available
id: 4, status: available
======================
Elapsed Time: 19.3081
```

## Recap

Threads are still something I’m learning how to best utilize. But this was a very engaging coding challenge.

I want to do more of these exercises regularly. They introduce me to new concepts and push me to be a better engineer. All I want is to grow my skills, both technical leadership and coding.

Hopefully along the way I can improve on how I am able to articulate how I solved the problem.. This blog post is a mess, but its better than never posting anything.

Happy New Year, and I wish you all the best in 2023.

Jeremy
