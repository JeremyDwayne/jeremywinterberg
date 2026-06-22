---
title: Advent of Code 2023 - Day 1 Trebuchet?!
pubDate: '2023-12-09'
tags: ["Advent of Code", "Go"]
draft: false
---
![ray of light near body of water](../../assets/blog/advent-of-code-2023-day-1/c8487640ee5d.png)

## Problem Summary

> On each line, the calibration value can be found by combining the first digit and the last digit (in that order) to form a single two-digit number. For example:

```
1abc2
pqr3stu8vwx
a1b2c3d4e5f
treb7uchet
```

> In this example, the calibration values of these four lines are 12, 38, 15, and 77. Adding these together produces 142. Consider your entire calibration document.
>
> What is the sum of all of the calibration values?

They provide you with a text file that looks a lot like the sample input above.

### Lets Solve It

Github: [View my solution](https://github.com/JeremyDwayne/advent_of_code/tree/main/2023/day1)

My initial thought process when reading the question is that I’ll need to do a few things.

1. Read a file

2. Parse each character of each line of that file

3. Find the first digit and last digit for each line, combine them for a 2-digit code for that line

4. Calculate a sum as we go, and output it at the end

#### Read a File

I have no clue how to read a file in Go or how to read each line, so we’re already learning something new. I’m assuming I’ll probably have to use the `os` package as I believe that’s used for operating system actions. Reading a file falls under that category.

Looking up [the docs](https://pkg.go.dev/os) I see there are a few methods for reading a file, `Read` and `Open`. I’ll put a pin in that because I don’t see something like ReadLine as an option. So for now I’m going to look into bullet 2, how to read each line of a file.

#### Read Lines of a file

Typically when wanting to read through a file you use a buffer. When I search for this I see there is a package for go called `bufio`. I see a few familiar options like `Read` and `ReadLine`. Read doesn’t seem to be what I’m looking for, and ReadLine recommends using `ReadString` or to use a `Scanner`. Since ReadString also recommends using a Scanner for simplicity, I’ll go ahead and use that.

`Scanner` has an example for reading lines, so let’s take a look at that.

```
func main(){
 scanner := bufio.NewScanner(os.Stdin)
 for scanner.Scan() {
 fmt.Println(scanner.Text()) // Println will add back the final '\n'
 }
 if err := scanner.Err(); err != nil {
 fmt.Fprintln(os.Stderr, "reading standard input:", err)
 }
}
```

It seems all we need to do is pass the file pointer to a `bufio.NewScanner` and then we can `scanner.Scan()` each line of the file, and pull out that line with `scanner.Text()`. This is great because it also answers bullet one of which file option we should use, `Open` to get a pointer to that file.

_Note: I don’t know if it’s called a pointer to a file in go, that’s just my recollection of how things work in c/c++_

#### Parse The line

Now that we have each line of the file, we need to find the first and last digits of that line.

Following, and modifying, their example `pqr3s1234tu8vwx` 3 and 8 are the first and last digits, which we then need to combine to 38 to be the code for that line.

The combination of digits means we need to treat them as characters and not integers, but we need to detect that they are integers. In ruby you can do something like `.to_i` so I looked for the equivalent in go and there is a `strcov` package with a `ParseInt` and an `Atoi` function. The Atoi function seems easier to use so we’ll go with that.

We’ll keep track of the first and last digits and loop through each character of the line. If we find an integer we’ll set both the first and last variables to that value. If the `first` variable isn’t empty we’ll only set the last variable.

Once we’ve made it to the end of the line we’ll combine those two strings and convert them to an integer, then add them to the running total being tracked by `sum`.

### My solution

If I take all of the above and slap it together, I get the following code. I’m just printing out the results for debugging purposes, and because all we care about is getting that final sum value. If this was code that was part of a larger system we would return the sum so that it could be used elsewhere in our codebase.

```
package main

import (
 "bufio"
 "fmt"
 "os"
 "strconv"
)

func main() {
 file, err := os.Open("../input.txt")
 if err != nil {
 panic(err)
 }
 defer file.Close()

 scanner := bufio.NewScanner(file)

 sum := 0
 for scanner.Scan() {
 first := ""
 last := ""
 for _, char := range scanner.Text() {
 if _, err := strconv.Atoi(string(char)); err == nil {
 if first == "" {
 first = string(char)
 }
 last = string(char)
 }
 }
 if value, err := strconv.Atoi(first + last); err == nil {
 sum += value
 }
 fmt.Printf("%s + %s = %s\n", first, last, first+last)
 }
 fmt.Println("--------------------")
 fmt.Println("Sum: ", sum)
}
```

Output:

```
...
7 + 1 = 71
4 + 7 = 47
7 + 7 = 77
7 + 8 = 78
3 + 8 = 38
--------------------
Sum: 55834
```

### Conclusion

This was a rather fun exercise. I learned about files, buffers, string conversion, and type-casting. I looked into Part 2 a little, and it’s not something I want to work on at this time. I may come back and update it later on. What is interesting about it, is that I would learn more about how go uses hashmaps.

Off to a great start! I look forward to solving Day 2 next!
