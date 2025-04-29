# pinotLoader

brew install k6

or

choco install k6

or

sudo apt install k6

#

You’ll need two helper files:

top_addresses_by_transaction_count.csv

query_template.sql

# Run

k6 run pinot_load_test.js   
