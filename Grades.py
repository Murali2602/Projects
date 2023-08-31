#!/usr/bin/env python3



###################################################
##Author: Murali
##Date: 22nd February 2022
##Coding: UTF-8 
###################################################




import smtplib
import os
from os.path import basename
import subprocess
from pyvirtualdisplay import Display
from PIL import Image
from time import sleep
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium import webdriver
from selenium.webdriver.common.by import By
from datetime import date
import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from email.mime.text import MIMEText



#Function to Save Screenshot
def save_screenshot(xpath, name, path: str = '/home/murali/scripts/Seneca/Grades/Pics/')  -> None:
    #To save the screenshot
    image_name = path + name
    WebDriverWait(driver, 40).until(
   EC.presence_of_all_elements_located((By.XPATH, "//*[@id='containerdiv']"))
 )
    total_width = driver.execute_script("return document.body.offsetWidth")
    total_height = driver.execute_script("return document.body.scrollHeight")
    driver.set_window_size(total_width, total_height+200)
    #Saving the screenshot in '/tmp' folder for further modification on the screenshot.
    driver.save_screenshot(f"/tmp/{name}.png")
    sleep(5)
    #Cropping the pic to get only the necessary information
    #Opens a image in RGB mode
    im = Image.open(rf"/tmp/{name}.png")
    # Size of the image in pixels (size of original image)
    # (This is not mandatory)
    width, height = im.size
    # Setting the points for cropped image
    left = 270
    top = 140
    right = 1800
    bottom = 1000
    # Cropped image of above dimension
    # (It will not change original image)
    im1 = im.crop((left, top, right, bottom))
    sleep(2)
    #Saving the pic in the final place.
    im1.save(f"{image_name}.png")

#Function to Send Mail.
def send_mail():
    # me == my email address
    # to == recipient's email address
    me = ""
    to = ""

    # Create message container - the correct MIME type is multipart/alternative.
    msg = MIMEMultipart('alternative')
    msg['Subject'] = "Grades"
    msg['From'] = "Murali <your email>" #your email is optional. if u specify ur email u will get header('Murali') as the name instead of the entire email. 
    msg['To'] = to

    # Create the body of the message (a plain-text and an HTML version).
    #Creating Time and Date stamps to include in the body of the message.
    message = date.today().strftime("%B %d, %Y")
    message1 = datetime.datetime.now().strftime('%H:%M:%S')

    #Using html to make the text bolder.
    html = f"""\
    <html>
      <head></head>
      <body>
        <p style="font-size:25px;"> 
        <b>{message}</b><br>
            <b>{message1}</b><br>
        </p>
      </body>
    </html>
    """
    # Attachments
    path = '/home/murali/scripts/Seneca/Grades/Pics/'
    files = [
        f'{path}Intro_To_Security.png',
        f'{path}OS_Windows.png',
        f'{path}OS_Unix.png',
        f'{path}Secure_Scripting.png',
        f'{path}Writing_Strategies.png',
    ]
    for file in files:
        with open(file, 'rb') as f:
            file_attachment = MIMEApplication(f.read(), Name=basename(file))
            #Setting the attachment name as the basename of the file(i.e if it was 'test.png' in the system it will also be 'test.png' in the attachment
            file_attachment['Content-Disposition'] = 'attachment filename="{}"'.format(basename(file))
            #Attach the file in loop
            msg.attach(file_attachment)

    # Record the MIME types of both parts - text/plain and text/html.
    part1 = MIMEText(message, 'plain')
    part2 = MIMEText(message1, 'plain')
    part3 = MIMEText(html, 'html')

    # Attach parts into message container.
    # According to RFC 2046, the last part of a multipart message, in this case
    # the HTML message, is best and preferred.
    msg.attach(part1)
    msg.attach(part2)
    msg.attach(part3)

    # sendmail function takes 3 arguments: sender's address, recipient's address
    # and message to send - here it is sent as one string.
    # Include ur gmail app password.
    passwd = '' #Ref - https://support.google.com/accounts/answer/185833?hl=en
    with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
        smtp.login(me, passwd)
        smtp.sendmail(me, to, msg.as_string())

#Function to recieve and modify OTP for MFA.
def otp():
    #I am using adb for otp receiving and modification, feel free to use anything u want.
    #Sleep for 10 secs to give the automation time to recieve and modify the otp output.
    sleep(10)
    #Different ip addresses since i have 2 network bands.
    ipaddress = [
        '192.168.0.20',
        '192.168.0.30'
    ]
    for ip in ipaddress:
        #Check the ip to which mobile is connected to and then do the further stuff.
        ping = os.popen(f'ping -c 4 {ip}').read()
        if "ttl=64" in ping:
            connect = subprocess.run(["adb", "connect", f"{ip}:5555"])
            get_code = subprocess.run(
                ["adb", "pull", "/sdcard/Fedora/code.txt", "/home/murali/scripts/Seneca/Grades/code.txt"])
            path = '/home/murali/scripts/Seneca/Grades/'
            with open(f'{path}/code.txt', 'r') as input, \
                    open(f'{path}/tmp.txt', 'w') as output:
                awk = subprocess.Popen(['awk', '{print $4}'], stdin=input, stdout=output)
                otp = os.replace(f'{path}/tmp.txt', f'{path}/code.txt')
            with open('/home/murali/scripts/Seneca/Grades/code.txt', 'r') as file:
                sleep(0.5)
                # file.seek(0)
                return file.read().rstrip()

#Login Automation Function
def login():
    # Bypass the First prompt by clicking ok.
    first_prompt = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div[3]/div/div/div/div/div/div/div[2]/button'))
    )
    first_prompt.click()

    #Click on the login button to enter credentials
    login_button = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div/div[1]/div/div[3]/div[1]/ul/li[2]/a/input'))
    )
    login_button.click()

    #Click on username field and type out the username
    username_search = driver.find_element(By.XPATH,'/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div[1]/div[3]/div/div/div/div[2]/div[2]/div/input[1]')
    username_search.send_keys(mail)

    next_button = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH,'/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div[1]/div[3]/div/div/div/div[4]/div/div/div/div/input'))
    )
    next_button.click()

    #Click on password field and type out the password
    pass_search = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH,'/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div/div[3]/div/div[2]/div/div[3]/div/div[2]/input'))
    )
    pass_search.send_keys(password)

    #Click on the login button after filling in the credentials
    login = driver.find_element(By.XPATH, '/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div/div[3]/div/div[2]/div/div[4]/div[2]/div/div/div/div/input')
    login.click()

    #Click on multi-factor authentication button.
    mfa = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH,'/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div/div[2]/div[2]/div/div[2]/div/div[2]/div/div[1]/div/div/div[2]'))
    )
    mfa.click()
    sleep(5)

    #Click on the 'Get Sms' option
    sms_code = driver.find_element(By.XPATH,'/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div/div[2]/div[2]/div/div[2]/div/div[3]/div/div[3]/div/input')
    #Sending the otp into the entry field.
    sms_code.send_keys(otp())

    #Click on 'Verify' Button

    verify = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div/form[1]/div/div/div[2]/div[1]/div/div/div/div/div/div[2]/div[2]/div/div[2]/div/div[6]/div/div/div/div/input'))
    )
    verify.click()
    sleep(5)
    stay_signed_in = WebDriverWait(driver, 40).until(
        EC.presence_of_element_located((By.XPATH, '/html/body/div/form/div/div/div[2]/div[1]/div/div/div/div/div/div[3]/div/div[2]/div/div[3]/div[2]/div/div/div[2]/input'))
    )
    stay_signed_in.click()
    #Sleeping for 10 secs to let the html, javascript code to load properly.
    sleep(10)

    #Click on "Courses" Menu
    Courses = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH,'/html/body/div[1]/div[2]/bb-base-layout/div/aside/div[1]/nav/ul/bb-base-navigation-button[4]/div/li/a/ng-switch/div/span'))
    )
    Courses.click()

#Function to Automate the navigation to Grades page and take screenshot.
def Intro_to_sec():
    driver.get('https://learn.senecacollege.ca/ultra/course')
    subject = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, '//*[@id="course-list-course-_654879_1"]'))
    )
    subject.click()
    frame = WebDriverWait(driver, 40).until(
        EC.frame_to_be_available_and_switch_to_it((By.XPATH, "//iframe[@name='classic-learn-iframe']"))
    )
    grades = driver.find_element(By.XPATH, '//*[@title="My Grades"]').click()
    sleep(3)
    save_screenshot(xpath="//*[@id='containerdiv']", name="Intro_To_Security")

#Function to Automate the navigation to Grades page and take screenshot.
def Secure_Scripting():
    driver.get('https://learn.senecacollege.ca/ultra/course')
    subject = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, '//*[@id="course-link-_657746_1"]'))
    )
    subject.click()
    frame = WebDriverWait(driver, 40).until(
        EC.frame_to_be_available_and_switch_to_it((By.XPATH, "//iframe[@name='classic-learn-iframe']"))
    )
    grades = driver.find_element(By.XPATH, '//*[@title="My Grades"]').click()
    sleep(3)
    save_screenshot(xpath="//*[@id='containerdiv']", name="Secure_Scripting")

#Function to Automate the navigation to Grades page and take screenshot.
def OS_Unix():
    driver.get('https://learn.senecacollege.ca/ultra/course')
    subject = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, '//*[@id="course-list-course-_655584_1"]'))
    )
    subject.click()
    frame = WebDriverWait(driver, 40).until(
        EC.frame_to_be_available_and_switch_to_it((By.XPATH, "//iframe[@name='classic-learn-iframe']"))
    )
    grades = driver.find_element(By.XPATH, '//*[@title="My Grades"]').click()
    sleep(3)
    save_screenshot(xpath="//*[@id='containerdiv']", name="OS_Unix")

#Function to Automate the navigation to Grades page and take screenshot.
def OS_Windows():
    driver.get('https://learn.senecacollege.ca/ultra/course')
    subject = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, '//*[@id="course-list-course-_655585_1"]'))
    )
    subject.click()
    frame = WebDriverWait(driver, 40).until(
        EC.frame_to_be_available_and_switch_to_it((By.XPATH, "//iframe[@name='classic-learn-iframe']"))
    )
    grades = driver.find_element(By.XPATH, '//*[@title="My Grades"]').click()
    sleep(3)
    save_screenshot(xpath="//*[@id='containerdiv']", name="OS_Windows")

#Function to Automate the navigation to Grades page and take screenshot.
def Writing_Strategies():
    driver.get('https://learn.senecacollege.ca/ultra/course')
    subject = WebDriverWait(driver, 40).until(
        EC.element_to_be_clickable((By.XPATH, '//*[@id="course-list-course-_655138_1"]'))
    )
    subject.click()
    frame = WebDriverWait(driver, 40).until(
        EC.frame_to_be_available_and_switch_to_it((By.XPATH, "//iframe[@name='classic-learn-iframe']"))
    )
    grades = driver.find_element(By.XPATH, '//*[@title="My Grades"]').click()
    sleep(3)
    save_screenshot(xpath="//*[@id='containerdiv']", name="Writing_Strategies")



#MAIN CODE
options = webdriver.ChromeOptions()
# user_agent = 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.2 (KHTML, like Gecko) Chrome/22.0.1216.0 Safari/537.2'
# options.add_argument('--headless')
# options.add_argument(f'user-agent={user_agent}')
display = Display(visible=0, size=(1920, 1080)) #Using this to run the program as a background task.
display.start()
options.add_experimental_option("excludeSwitches", ["enable-automation"])
options.add_experimental_option('useAutomationExtension', False)
options.add_argument("--disable-blink-features=AutomationControlled")
driver = webdriver.Chrome(options=options)
driver.maximize_window()

#The login-page credentials
mail = ""
password = ""

driver.get("https://learn.senecacollege.ca/")

#Calling all the functions
login()
Intro_to_sec()
Secure_Scripting()
OS_Unix()
OS_Windows()
Writing_Strategies()
send_mail()





