import time

x = bytearray(1024*1024*1500)
count = 1
while True:
    time.sleep(1)
    print(count)
    count += 1