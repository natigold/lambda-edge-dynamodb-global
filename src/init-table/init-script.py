import boto3
import uuid
import random
import sys

table_name = ''
region = 'us-east-1'

def read_data(filename):
    with open(filename, 'r') as f:
        return f.read().splitlines()
    
# Write batch of 25 items to DynamoDB table
def batch_write_items(table, items):
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
            batch.batch_size = 25

# Create a list of 300 random strings
def create_strings():
    strings = []
    for i in range(300):
        i = uuid.uuid4()
        item = str(i)
        strings.append(item)
    return strings

# Create random URLs
def create_urls(urls, strings):
    random_urls = []
    for url in urls:
        for stringy in strings:
            random_urls.append(url + '/' + stringy)
    return random_urls

def connect_DynamoDB():
    dynamodb = boto3.resource('dynamodb', region_name=region)
    table = dynamodb.Table(table_name)
    return table

def create_items(random_urls, types):
    items = []
    statuses = [True, False]

    for i in range(len(random_urls)):
        random_j = random.randint(0,9)
        item = {
            'url': random_urls[i],
            'type': types[random_j],
            'status': statuses[random.randint(0,1)]
        }
        items.append(item)

    return items

# 1. Read from file
# 2. Create a list of 300 random items
# 3. Create a list of random URLs
# 4. Write the list of random URLs to DynamoDB table in batches of 25 items
def main():
    urls = read_data('url-list')
    print('Read a list of URLs from file', len(urls))
    types = read_data('type-list')
    print('Read a list of Types from file', len(types))
    strings = create_strings()
    print('Created a list of random strings', len(strings))
    random_urls = create_urls(urls, strings)
    print('Created a list of random URLs', len(random_urls))
    items = create_items(random_urls, types)
    print('Created a list of items', len(items))

    table = connect_DynamoDB()

    batch_write_items(table, items)


if __name__ == '__main__':
    assert len(sys.argv) >= 2, 'Please provide a table name'

    parameter_name = sys.argv[1].split('=')[0]
    assert parameter_name == 'table_name', 'Please provide a table name'
    table_name = sys.argv[1].split('=')[1]
    assert table_name != '', 'Please provide a table name'

    main()

