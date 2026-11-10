import time
def inner(n):
    s = 0
    for i in range(n):
        s += i * i
    return s
def outer():
    for _ in range(300):
        inner(20000)
outer()
