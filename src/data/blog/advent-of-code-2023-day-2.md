---
title: Advent of Code 2023 - Day 2 Cube Conundrum
pubDate: '2023-12-11'
tags: ["Advent of Code", "Go"]
draft: false
---
![orange and white square illustration](../../assets/blog/advent-of-code-2023-day-2/0917daaa0086.png)

## Problem Summary

As you walk, the Elf shows you a small bag and some cubes which are either red, green, or blue. Each time you play this game, he will hide a secret number of cubes of each color in the bag, and your goal is to figure out information about the number of cubes.

ou play several games and record the information from each game (your puzzle input). Each game is listed with its ID number (like the 11 in Game 11: …) followed by a semicolon-separated list of subsets of cubes that were revealed from the bag (like 3 red, 5 green, 4 blue).

For example, the record of a few games might look like this:

```
Game 1: 3 blue, 4 red; 1 red, 2 green, 6 blue; 2 green
Game 2: 1 blue, 2 green; 3 green, 4 blue, 1 red; 1 green, 1 blue
Game 3: 8 green, 6 blue, 20 red; 5 blue, 4 red, 13 green; 5 green, 1 red
Game 4: 1 green, 3 red, 6 blue; 3 green, 6 red; 3 green, 15 blue, 14 red
Game 5: 6 red, 1 blue, 3 green; 2 blue, 1 red, 2 green
```

The Elf would first like to know which games would have been possible if the bag contained only 12 red cubes, 13 green cubes, and 14 blue cubes?

In the example above, games 1, 2, and 5 would have been possible if the bag had been loaded with that configuration.

If you add up the IDs of the games that would have been possible, you get 8.

Determine which games would have been possible if the bag had been loaded with only 12 red cubes, 13 green cubes, and 14 blue cubes. What is the sum of the IDs of those games?

## Let’s Solve it

Github: [View my solution](https://github.com/JeremyDwayne/advent_of_code/tree/main/2023/day2)

We can reuse some of the code from day 1. I suspect a lot of the boilerplate will be similar each day of advent of code. I’m not sure if I want to extract it into a utility package just yet, so for now, I’ll just do some good old-fashioned copy-pasting.

When looking at the sample input a few things stand out to me initially.

1. There are multiple delimiters, `:` `,` `;`, which tells me we can do some string splitting or regex.

2. We probably can’t assume there will always be the same number of games per line, or that all colors will be pulled every time.

### String Split & Regex

I know regex shouldn’t be the first thing you go to because it’s so hard to get right, but in this situation, I think it’s the best way to capture the game ID.

I looked up how to do regex matchers in go, but to be completely honest it is still rather confusing for me. But I think I’ve got a decent grasp on it for now.

Because we’re looping over every line of the file, go recommends that you compile outside the loop. So we create the `regexp` pattern to pull out the game id and the list of games. Then inside the scanner loop we’ll find all strings that match that regex.

```
matcher := regexp.MustCompile(`Game (\d+): (.*)`)
...
matched := matcher.FindAllStringSubmatch(line, -1)[0]
```

### Plan for Variability

Even without looking at the sample input, it’s smart to assume these values can vary. But if we were to cheat, that assumption is backed up. Some have fewer games, and some don’t have all of the colors. So we’re doing the right thing by parsing and looping through what _is_ there.

Now that we have the list of games, we can do some `strings.Split` to loop through each round, and then again to get each set of cubes. Each round is separated by a `;` and each cube by a `,`.

### My Solution

That’s all there is to this. I’m not sure if this is an optimal solution, particularly because of how many loops there are. But it does work, and gives the correct answer.

```
package main

import (
 "bufio"
 "fmt"
 "os"
 "regexp"
 "strconv"
 "strings"
)

func main() {
 file, err := os.Open("input.txt")
 if err != nil {
 panic(err)
 }
 defer file.Close()

 scanner := bufio.NewScanner(file)

 bag := map[string]int{"red": 12, "green": 13, "blue": 14}
 sum := 0
 matcher := regexp.MustCompile(`Game (\d+): (.*)`)

 for scanner.Scan() {
 line := scanner.Text()
 ok := true
 matched := matcher.FindAllStringSubmatch(line, -1)[0]

 id, err := strconv.Atoi(matched[1])
 if err != nil {
 panic(err)
 }
 games := strings.Split(matched[2], "; ")

 for _, game := range games {
 cubes := strings.Split(game, ", ")
 for _, cube := range cubes {
 rolls := strings.Split(cube, " ")
 quantity, err := strconv.Atoi(rolls[0])
 if err != nil {
 panic(err)
 }
 color := rolls[1]

 if bag[color] < quantity {
 ok = false
 }
 }
 }
 if ok {
 sum += id
 }
 }
 fmt.Println(sum)
}
```
