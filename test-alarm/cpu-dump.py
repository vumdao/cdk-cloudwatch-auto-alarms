import time
from datetime import datetime
from multiprocessing import Pool, cpu_count

def power(x):
    """ bump cpu in 5 min """
    start = datetime.now()
    duration = 0
    while duration < 300:
        x*x
        duration = (datetime.now() - start).total_seconds()


if __name__ == '__main__':
    processes = cpu_count()
    pool = Pool(processes)
    pool.map(power, range(processes))
