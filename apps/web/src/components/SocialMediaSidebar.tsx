'use client';
import React from 'react';
import { FaFacebookSquare, FaTwitterSquare, FaInstagram, FaLinkedin, FaYoutubeSquare } from 'react-icons/fa';
import { SiTiktok } from 'react-icons/si';

const SocialMediaSidebar: React.FC = () => {
  const socialLinks = [
    {
      name: 'facebook',
      url: 'https://www.facebook.com/khanhub.com.pk/',
      icon: <FaFacebookSquare />,
      bgColor: '#3b5998',
      label: 'click here to visit'
    },
    {
      name: 'instagram',
      url: 'https://www.instagram.com/khanhub.com.pk/',
      icon: <FaInstagram />,
      bgColor: '#e4405f',
      label: 'click here to visit'
    },
    {
      name: 'tiktok',
      url: 'https://www.tiktok.com/@dr_muhammad.khan',
      icon: <SiTiktok />,
      bgColor: '#000000',
      label: 'click here to visit'
    },
    {
      name: 'youtube',
      url: 'https://www.youtube.com/channel/UC43UJw8xOdkp9y_iJIznINg',
      icon: <FaYoutubeSquare />,
      bgColor: '#cd201f',
      label: 'click here to visit'
    }
  ];

  return (
    <div className="social-sidebar">
      {socialLinks.map((social) => (
        <a
          key={social.name}
          href={social.url || '#'}
          className={`social-link ${social.name}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ backgroundColor: social.bgColor }}
          aria-label={`Visit our ${social.name} page`}
        >
          {social.label}
          <span className="social-icon">{social.icon}</span>
        </a>
      ))}

      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap');

        .social-sidebar {
          position: fixed;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
          z-index: 10;
        }

        .social-link {
          text-decoration: none;
          width: 210px;
          color: #fff;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding: 5px;
          font-size: 20px;
          font-family: 'Source Sans Pro', sans-serif;
          transform: translateX(-170px);
          transition: all 0.5s linear;
        }

        .social-link:hover {
          transform: translateX(0);
        }

        .social-icon {
          padding-left: 20px;
          font-size: 30px;
          display: flex;
          align-items: center;
          animation: letszoom 3s linear alternate-reverse infinite;
        }

        @keyframes letszoom {
          from {
            transform: scale(0.8);
          }
          to {
            transform: scale(1);
          }
        }

        .facebook {
          background: #3b5998;
        }

        .instagram {
          background: #e4405f;
        }

        .tiktok {
          background: #000000;
        }

        .youtube {
          background: #cd201f;
        }
      `}</style>
    </div>
  );
};

export default SocialMediaSidebar;