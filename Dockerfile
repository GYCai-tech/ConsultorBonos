FROM nginx:alpine
COPY web/index.html /usr/share/nginx/html/index.html
EXPOSE 70
CMD ["nginx", "-g", "daemon off;"]
