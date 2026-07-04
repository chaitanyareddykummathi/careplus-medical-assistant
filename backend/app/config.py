import numpy as np
import matplotlib.pyplot as plt
# 1. Define the function to minimize (e.g., a simple quadratic function)
def f(x):
return x**2 - 4*x + 6
# 2. Define the derivative (gradient) ofthe function
def df(x):
return 2*x - 4
# 3. Implement the gradient descent algorithm
def gradient_descent(initial_x, learning_rate, num_iterations):
x = initial_x
x_history = [x] # To store the values of x at each iteration
for i in range(num_iterations):
gradient = df(x) # Calculate the gradient
x = x - learning_rate * gradient # Update x
x_history.append(x)
return x, x_history
# 4. Set parameters and run the algorithm
initial_x = 0
learning_rate = 0.1
num_iterations = 50
final_x, x_history = gradient_descent(initial_x, learning_rate, num_iterations)
print(f"Local minimum found at x: {final_x:.2f}")
# 5. Visualize the process(optional)
x_vals = np.linspace(-1, 5, 100)
plt.plot(x_vals, f(x_vals), label='f(x)')
plt.plot(x_history, [f(val) for val in x_history], 'rx-', label='Gradient Descent Path')
plt.xlabel('x')
plt.ylabel('f(x)')
plt.title('Gradient Descent Visualization')
plt.legend()
plt.grid(True)
plt.show()