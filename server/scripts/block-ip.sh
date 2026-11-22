#!/bin/bash

# FUNCIONAL
# unique_strings=$(while IFS= read -r line; do
#   echo "$line"
# done < "./tmp.txt" | sort | uniq)

# echo "$unique_strings" >> "./output.txt"


# JSON tester
unique_strings=$(while IFS= read -r line; do
  echo "\"$line\""
done < "./tmp.txt" | sort | uniq | paste -sd "," -)

echo "[$unique_strings]" > "./output.json"