
import platform
import psutil
import GPUtil 
import torch 

def get_system_specifications():
    print("--- System Information ---")
    print(f"Operating System: {platform.system()} {platform.release()} ({platform.machine()})")
    print(f"Processor: {platform.processor()}")

    print("\n--- CPU Information ---")
    print(f"Physical cores: {psutil.cpu_count(logical=False)}")
    print(f"Total cores (including logical): {psutil.cpu_count(logical=True)}")
    cpufreq = psutil.cpu_freq()
    if cpufreq:
        print(f"Max Frequency: {cpufreq.max:.2f}Mhz")
        print(f"Min Frequency: {cpufreq.min:.2f}Mhz")
        print(f"Current Frequency: {cpufreq.current:.2f}Mhz")
    else:
        print("CPU Frequency could not be determined (may require admin rights or not supported).")
    print(f"CPU Usage: {psutil.cpu_percent()}%")

    print("\n--- Memory (RAM) Information ---")
    svmem = psutil.virtual_memory()
    print(f"Total RAM: {get_size(svmem.total)}")
    print(f"Available RAM: {get_size(svmem.available)}")
    print(f"Used RAM: {get_size(svmem.used)}")
    print(f"RAM Percentage Used: {svmem.percent}%")

    print("\n--- GPU Information ---")
    try:
        gpus = GPUtil.getGPUs()
        if not gpus:
            print("No NVIDIA GPU found by GPUtil.")
        else:
            for i, gpu in enumerate(gpus):
                print(f"GPU {i}: {gpu.name}")
                print(f"  Total Memory: {gpu.memoryTotal}MB")
                print(f"  Free Memory: {gpu.memoryFree}MB")
                print(f"  Used Memory: {gpu.memoryUsed}MB")
                print(f"  Temperature: {gpu.temperature} °C")
                print(f"  GPU Usage: {gpu.load*100}%")
    except NameError: # Agar GPUtil import nahi hua
        print("GPUtil library not found. Please install it using: pip install GPUtil")
    except Exception as e:
        print(f"Could not retrieve GPU details using GPUtil: {e}")

    print("\n--- PyTorch CUDA Information ---")
    if torch.cuda.is_available():
        print("PyTorch CUDA is available.")
        print(f"CUDA Device Count: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"Device {i}: {torch.cuda.get_device_name(i)}")
            print(f"  Total Memory: {get_size(torch.cuda.get_device_properties(i).total_memory)}")
            # current_free_mem, _ = torch.cuda.mem_get_info(i) # Requires PyTorch 1.7+
            # print(f"  Free Memory (approx): {get_size(current_free_mem)}")
    else:
        print("PyTorch CUDA is NOT available. Operations will run on CPU.")


def get_size(bytes, suffix="B"):
    """
    Scale bytes to its proper format
    e.g:
        1253656 => '1.20MB'
        1253656678 => '1.17GB'
    """
    factor = 1024
    for unit in ["", "K", "M", "G", "T", "P"]:
        if bytes < factor:
            return f"{bytes:.2f}{unit}{suffix}"
        bytes /= factor

if __name__ == "__main__":
    
    try:
        import GPUtil
    except ImportError:
        print("GPUtil library not found. Attempting to install...")
        try:
            import subprocess
            import sys
            subprocess.check_call([sys.executable, "-m", "pip", "install", "GPUtil"])
            print("GPUtil installed successfully. Please re-run the script.")
            sys.exit() 
        except Exception as e:
            print(f"Failed to install GPUtil: {e}")
            print("Please install GPUtil manually: pip install GPUtil")

    get_system_specifications()